-- RFP v1.1: team settings (seasonal skin, DR-08) and trial-run reset (FR-M-15).

alter table teams add column settings jsonb not null default '{"skin": "halloween"}';
alter table teams add column data_epoch int not null default 0;

-- Settings the player app needs before login (the skin), plus the current data epoch.
create function public_team_settings(p_team_slug text) returns jsonb
language sql stable security definer set search_path = public as $$
  select t.settings || jsonb_build_object('dataEpoch', t.data_epoch) from teams t where t.slug = p_team_slug
$$;

create function mentor_settings() returns jsonb
language sql stable security definer set search_path = public as $$
  select t.settings || jsonb_build_object('dataEpoch', t.data_epoch) from teams t where t.id = require_mentor()
$$;

create function mentor_update_settings(p_patch jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare t uuid := require_mentor();
begin
  update teams set settings = settings || (p_patch - 'dataEpoch') where id = t;
end $$;

-- Delete the children's answers, attempts and timings and clear their level progress; keep
-- profiles, PINs, the mentor's level locks/unlocks, form locks and settings. Bumping the epoch
-- makes every device drop writes it queued before the reset.
create function mentor_reset_trial() returns void
language plpgsql security definer set search_path = public as $$
declare t uuid := require_mentor();
begin
  delete from answer_versions where team_id = t;
  delete from quiz_attempts where team_id = t;
  delete from section_timings where team_id = t;
  update level_states set pointer = null, submitted_at = null, completed_at = null, reset_count = 0, updated_at = now()
    where team_id = t;
  update teams set data_epoch = data_epoch + 1 where id = t;
end $$;

create or replace function player_state(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare p profiles;
begin
  p := session_profile(p_token);
  return jsonb_build_object(
    'dataEpoch', (select data_epoch from teams where id = p.team_id),
    'profile', jsonb_build_object('id', p.id, 'displayName', p.display_name, 'avatar', p.avatar),
    'levels', coalesce((select jsonb_agg(level_state_json(l)) from level_states l where l.profile_id = p.id), '[]'),
    'answers', coalesce((
      select jsonb_agg(answer_json(a)) from (
        select distinct on (question_id, part_id) * from answer_versions
        where profile_id = p.id order by question_id, part_id, version desc
      ) a), '[]'),
    'attempts', coalesce((select jsonb_agg(attempt_json(q) order by q.answered_at) from quiz_attempts q where q.profile_id = p.id), '[]')
  );
end $$;

create or replace function player_write(p_token text, m jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare
  p profiles;
  v_kind text := m->>'kind';
  v_level text := m->>'levelId';
  v_cv uuid;
  v_at timestamptz := client_time(m->>'at');
  v_latest answer_versions;
  v_correct boolean;
  v_locked boolean;
  v_epoch int;
begin
  p := session_profile(p_token);

  -- FR-M-15: after a trial-run reset, writes queued on a device before the reset are refused for
  -- good ('stale'); the device drops them and reloads. Writes from before epochs existed count as 0.
  select data_epoch into v_epoch from teams where id = p.team_id;
  if coalesce((m->>'epoch')::int, 0) <> v_epoch then raise exception 'stale'; end if;

  select id into v_cv from content_versions where id = (m->>'contentVersionId')::uuid and team_id = p.team_id;
  if v_cv is null then
    select id into v_cv from content_versions where team_id = p.team_id and is_active;
  end if;

  if v_kind = 'pointer' then
    perform ensure_level_state(p, v_level);
    update level_states set pointer = m->'pointer', updated_at = now()
      where profile_id = p.id and level_id = v_level;

  elsif v_kind = 'quizAttempt' then
    if exists (select 1 from quiz_attempts where id = (m->>'id')::uuid) then return; end if;
    select coalesce(bool_or((o->>'correct')::boolean), false) into v_correct
      from content_versions cv,
           jsonb_array_elements(cv.content->'levels') l,
           jsonb_array_elements(l->'quiz') q,
           jsonb_array_elements(q->'options') o
      where cv.id = v_cv and q->>'id' = m->>'questionId' and o->>'id' = m->>'chosenOptionId';
    perform pg_advisory_xact_lock(hashtext(p.id::text || (m->>'questionId')));
    insert into quiz_attempts (id, team_id, profile_id, content_version_id, level_id, question_id, attempt_no,
        seed, displayed_order, chosen_option_id, correct, shown_at, answered_at, device_type)
      values ((m->>'id')::uuid, p.team_id, p.id, v_cv, v_level, m->>'questionId',
        (select coalesce(max(attempt_no), 0) + 1 from quiz_attempts where profile_id = p.id and question_id = m->>'questionId'),
        (m->>'seed')::bigint, array(select jsonb_array_elements_text(m->'displayedOrder')),
        m->>'chosenOptionId', v_correct, client_time(m->>'shownAt'), v_at, coalesce(m->>'deviceType', 'phone'));

  elsif v_kind = 'answer' then
    select form_locked into v_locked from level_states where profile_id = p.id and level_id = v_level;
    if coalesce(v_locked, false) then raise exception 'locked'; end if;
    perform pg_advisory_xact_lock(hashtext(p.id::text || (m->>'questionId') || (m->>'partId')));
    select * into v_latest from answer_versions
      where profile_id = p.id and question_id = m->>'questionId' and part_id = m->>'partId'
      order by version desc limit 1;
    if found and v_latest.edit_session = m->>'editSession' then
      update answer_versions set value = m->'value', dont_know = coalesce((m->>'dontKnow')::boolean, false),
          updated_at = greatest(v_at, created_at), device_type = coalesce(m->>'deviceType', device_type)
        where id = v_latest.id;
    else
      insert into answer_versions (id, team_id, profile_id, content_version_id, level_id, question_id, part_id,
          value, dont_know, version, edit_session, device_type, created_at, updated_at)
        values ((m->>'id')::uuid, p.team_id, p.id, v_cv, v_level, m->>'questionId', m->>'partId',
          m->'value', coalesce((m->>'dontKnow')::boolean, false), coalesce(v_latest.version, 0) + 1,
          m->>'editSession', coalesce(m->>'deviceType', 'phone'), v_at, v_at)
        on conflict (id) do nothing;
    end if;

  elsif v_kind = 'submit' then
    perform ensure_level_state(p, v_level);
    update level_states set submitted_at = coalesce(submitted_at, v_at), completed_at = coalesce(completed_at, v_at),
        updated_at = now()
      where profile_id = p.id and level_id = v_level;

  elsif v_kind = 'timing' then
    insert into section_timings (id, team_id, profile_id, content_version_id, level_id, section, started_at, ended_at)
      values ((m->>'timingId')::uuid, p.team_id, p.id, v_cv, v_level, m->>'section',
        client_time(m->>'startedAt'), client_time(m->>'endedAt'))
      on conflict (id) do update set ended_at = excluded.ended_at
        where section_timings.profile_id = p.id;

  else
    raise exception 'invalid';
  end if;
end $$;

grant execute on function public_team_settings(text) to anon, authenticated;
grant execute on function mentor_settings(), mentor_update_settings(jsonb), mentor_reset_trial() to authenticated;
