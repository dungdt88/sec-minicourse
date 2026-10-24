-- Tiệm Vòng Tay Rừng Xanh: schema, row-level security and server functions.
--
-- Access model
--   Children (anon role): no table access at all. They call the player_* functions with a
--     session token obtained from player_login(profile, PIN). Tokens are stored hashed.
--   Mentors (authenticated role, Supabase Auth): read their team's rows through RLS and change
--     things only through mentor_* functions, which check membership in `mentors`.
--   PIN hashes live in profile_secrets, which has RLS on and no policies: nobody reads them.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------- tables

create table teams (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);

create table mentors (
  user_id uuid primary key references auth.users on delete cascade,
  team_id uuid not null references teams on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

create table content_versions (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams on delete cascade,
  content_version text not null,
  schema_version text not null,
  content jsonb not null,
  is_active boolean not null default false,
  uploaded_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now()
);
create unique index content_versions_one_active on content_versions (team_id) where is_active;

create table profiles (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  avatar text not null,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

create table profile_secrets (
  profile_id uuid primary key references profiles on delete cascade,
  pin_hash text not null
);

create table player_sessions (
  token_hash text primary key,
  profile_id uuid not null references profiles on delete cascade,
  team_id uuid not null references teams on delete cascade,
  device_type text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table pin_attempts (
  id bigint generated always as identity primary key,
  profile_id uuid not null references profiles on delete cascade,
  success boolean not null,
  created_at timestamptz not null default now()
);
create index pin_attempts_recent on pin_attempts (profile_id, created_at);

create table level_states (
  team_id uuid not null references teams on delete cascade,
  profile_id uuid not null references profiles on delete cascade,
  level_id text not null,
  override text check (override in ('unlocked', 'locked')),
  form_locked boolean not null default false,
  submitted_at timestamptz,
  completed_at timestamptz,
  reset_count int not null default 0,
  pointer jsonb,
  updated_at timestamptz not null default now(),
  primary key (profile_id, level_id)
);

create table quiz_attempts (
  id uuid primary key,
  team_id uuid not null references teams on delete cascade,
  profile_id uuid not null references profiles on delete cascade,
  content_version_id uuid not null references content_versions,
  level_id text not null,
  question_id text not null,
  attempt_no int not null,
  seed bigint not null,
  displayed_order text[] not null,
  chosen_option_id text not null,
  correct boolean not null,
  shown_at timestamptz not null,
  answered_at timestamptz not null,
  device_type text not null,
  received_at timestamptz not null default now(),
  unique (profile_id, question_id, attempt_no)
);

create table answer_versions (
  id uuid primary key,
  team_id uuid not null references teams on delete cascade,
  profile_id uuid not null references profiles on delete cascade,
  content_version_id uuid not null references content_versions,
  level_id text not null,
  question_id text not null,
  part_id text not null,
  value jsonb,
  dont_know boolean not null default false,
  version int not null,
  edit_session text not null,
  device_type text not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  received_at timestamptz not null default now(),
  unique (profile_id, question_id, part_id, version)
);
create index answer_versions_latest on answer_versions (profile_id, question_id, part_id, version desc);

create table section_timings (
  id uuid primary key,
  team_id uuid not null references teams on delete cascade,
  profile_id uuid not null references profiles on delete cascade,
  content_version_id uuid not null references content_versions,
  level_id text not null,
  section text not null check (section in ('cards', 'quiz', 'form')),
  started_at timestamptz not null,
  ended_at timestamptz
);

-- Client and server errors for the mentor console (NFR-12). Never holds answer text.
create table error_log (
  id bigint generated always as identity primary key,
  team_id uuid references teams on delete cascade,
  message text not null,
  context jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- immutability

-- Content versions never change once stored (FR-C-03); only the active flag moves.
create function forbid_content_edit() returns trigger language plpgsql as $$
begin
  if new.content is distinct from old.content or new.content_version is distinct from old.content_version
     or new.team_id is distinct from old.team_id then
    raise exception 'content versions are immutable';
  end if;
  return new;
end $$;
create trigger content_versions_immutable before update on content_versions
  for each row execute function forbid_content_edit();

-- Quiz attempts are a log: the first attempt is never overwritten (FR-P-17).
create function forbid_update() returns trigger language plpgsql as $$
begin
  raise exception '% is append-only', tg_table_name;
end $$;
create trigger quiz_attempts_append_only before update on quiz_attempts
  for each row execute function forbid_update();

-- ---------------------------------------------------------------- RLS

alter table teams enable row level security;
alter table mentors enable row level security;
alter table content_versions enable row level security;
alter table profiles enable row level security;
alter table profile_secrets enable row level security;
alter table player_sessions enable row level security;
alter table pin_attempts enable row level security;
alter table level_states enable row level security;
alter table quiz_attempts enable row level security;
alter table answer_versions enable row level security;
alter table section_timings enable row level security;
alter table error_log enable row level security;

create function my_team() returns uuid language sql stable security definer set search_path = public as $$
  select team_id from mentors where user_id = auth.uid()
$$;

create policy mentor_read on teams for select to authenticated using (id = my_team());
create policy mentor_read on mentors for select to authenticated using (team_id = my_team());
create policy mentor_read on content_versions for select to authenticated using (team_id = my_team());
create policy mentor_read on profiles for select to authenticated using (team_id = my_team());
create policy mentor_read on level_states for select to authenticated using (team_id = my_team());
create policy mentor_read on quiz_attempts for select to authenticated using (team_id = my_team());
create policy mentor_read on answer_versions for select to authenticated using (team_id = my_team());
create policy mentor_read on section_timings for select to authenticated using (team_id = my_team());
create policy mentor_read on error_log for select to authenticated using (team_id = my_team());

-- ---------------------------------------------------------------- helpers

create function require_mentor() returns uuid language plpgsql stable security definer set search_path = public as $$
declare t uuid;
begin
  t := my_team();
  if t is null then raise exception 'unauthorized' using errcode = '28000'; end if;
  return t;
end $$;

create function session_profile(p_token text) returns profiles
language plpgsql security definer set search_path = public, extensions as $$
declare
  s player_sessions;
  p profiles;
begin
  select * into s from player_sessions where token_hash = encode(digest(p_token, 'sha256'), 'hex');
  if not found then raise exception 'unauthorized' using errcode = '28000'; end if;
  select * into p from profiles where id = s.profile_id and archived_at is null;
  if not found then raise exception 'unauthorized' using errcode = '28000'; end if;
  if s.last_seen_at < now() - interval '5 minutes' then
    update player_sessions set last_seen_at = now() where token_hash = s.token_hash;
  end if;
  return p;
end $$;

-- Clamp client clocks: queued offline writes keep their real time, but never a future one.
create function client_time(p_at text) returns timestamptz language sql stable as $$
  select least(coalesce(p_at::timestamptz, now()), now() + interval '5 minutes')
$$;

-- ---------------------------------------------------------------- public (profile picker)

create function public_profiles(p_team_slug text)
returns table (id uuid, display_name text, avatar text)
language sql stable security definer set search_path = public as $$
  select p.id, p.display_name, p.avatar
  from profiles p join teams t on t.id = p.team_id
  where t.slug = p_team_slug and p.archived_at is null
  order by p.created_at
$$;

create function public_active_content(p_team_slug text)
returns table (id uuid, content jsonb)
language sql stable security definer set search_path = public as $$
  select c.id, c.content
  from content_versions c join teams t on t.id = c.team_id
  where t.slug = p_team_slug and c.is_active
$$;

-- ---------------------------------------------------------------- player

-- Returns {"token": …} or {"error": "wrong_pin" | "rate_limited" | "not_found"}. Errors are returned,
-- not raised, so the failed attempt row is committed and counts towards the lockout.
create function player_login(p_profile_id uuid, p_pin text, p_device text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  p profiles;
  failures int;
  token text;
begin
  select * into p from profiles where id = p_profile_id and archived_at is null;
  if not found then return jsonb_build_object('error', 'not_found'); end if;

  select count(*) into failures from pin_attempts
    where profile_id = p.id and not success and created_at > now() - interval '15 minutes';
  if failures >= 5 then return jsonb_build_object('error', 'rate_limited'); end if;

  if not exists (select 1 from profile_secrets s where s.profile_id = p.id and s.pin_hash = crypt(p_pin, s.pin_hash)) then
    insert into pin_attempts (profile_id, success) values (p.id, false);
    return jsonb_build_object('error', 'wrong_pin');
  end if;

  insert into pin_attempts (profile_id, success) values (p.id, true);
  delete from pin_attempts where created_at < now() - interval '1 day';
  token := encode(gen_random_bytes(32), 'hex');
  insert into player_sessions (token_hash, profile_id, team_id, device_type)
    values (encode(digest(token, 'sha256'), 'hex'), p.id, p.team_id, p_device);
  return jsonb_build_object('token', token);
end $$;

create function player_logout(p_token text) returns void
language sql security definer set search_path = public, extensions as $$
  delete from player_sessions where token_hash = encode(digest(p_token, 'sha256'), 'hex')
$$;

create function player_state(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare p profiles;
begin
  p := session_profile(p_token);
  return jsonb_build_object(
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

create function level_state_json(l level_states) returns jsonb language sql immutable as $$
  select jsonb_build_object('profileId', l.profile_id, 'levelId', l.level_id, 'override', l.override,
    'formLocked', l.form_locked, 'submittedAt', l.submitted_at, 'completedAt', l.completed_at,
    'resetCount', l.reset_count, 'pointer', l.pointer, 'updatedAt', l.updated_at)
$$;

create function answer_json(a answer_versions) returns jsonb language sql immutable as $$
  select jsonb_build_object('id', a.id, 'teamId', a.team_id, 'profileId', a.profile_id,
    'contentVersionId', a.content_version_id, 'levelId', a.level_id, 'questionId', a.question_id,
    'partId', a.part_id, 'value', a.value, 'dontKnow', a.dont_know, 'version', a.version,
    'editSession', a.edit_session, 'deviceType', a.device_type, 'createdAt', a.created_at, 'updatedAt', a.updated_at)
$$;

create function attempt_json(q quiz_attempts) returns jsonb language sql immutable as $$
  select jsonb_build_object('id', q.id, 'teamId', q.team_id, 'profileId', q.profile_id,
    'contentVersionId', q.content_version_id, 'levelId', q.level_id, 'questionId', q.question_id,
    'attemptNo', q.attempt_no, 'seed', q.seed, 'displayedOrder', to_jsonb(q.displayed_order),
    'chosenOptionId', q.chosen_option_id, 'correct', q.correct, 'shownAt', q.shown_at,
    'answeredAt', q.answered_at, 'deviceType', q.device_type)
$$;

create function ensure_level_state(p profiles, p_level text) returns void
language sql security definer set search_path = public as $$
  insert into level_states (team_id, profile_id, level_id) values (p.team_id, p.id, p_level)
  on conflict do nothing
$$;

-- Every player write goes through here; each mutation kind is idempotent by its id.
create function player_write(p_token text, m jsonb) returns void
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
begin
  p := session_profile(p_token);

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

-- Errors from the player app. A token is optional; text is truncated and stored without answers.
create function report_error(p_team_slug text, p_message text, p_context jsonb) returns void
language sql security definer set search_path = public as $$
  insert into error_log (team_id, message, context)
  select t.id, left(p_message, 500), coalesce(p_context, '{}') from teams t where t.slug = p_team_slug
  and (select count(*) from error_log e where e.team_id = t.id and e.created_at > now() - interval '1 hour') < 200
$$;

-- ---------------------------------------------------------------- mentor

create function mentor_create_profile(p_name text, p_avatar text, p_pin text) returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare t uuid := require_mentor(); new_id uuid;
begin
  if p_pin !~ '^[0-9]{4}$' then raise exception 'invalid'; end if;
  insert into profiles (team_id, display_name, avatar) values (t, p_name, p_avatar) returning id into new_id;
  insert into profile_secrets (profile_id, pin_hash) values (new_id, crypt(p_pin, gen_salt('bf', 8)));
  return new_id;
end $$;

create function mentor_update_profile(p_id uuid, p_name text, p_avatar text, p_archived boolean) returns void
language plpgsql security definer set search_path = public as $$
declare t uuid := require_mentor();
begin
  update profiles set
    display_name = coalesce(p_name, display_name),
    avatar = coalesce(p_avatar, avatar),
    archived_at = case when p_archived is null then archived_at when p_archived then coalesce(archived_at, now()) else null end
  where id = p_id and team_id = t;
  if p_archived then delete from player_sessions where profile_id = p_id; end if;
end $$;

create function mentor_set_pin(p_id uuid, p_pin text) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare t uuid := require_mentor();
begin
  if p_pin !~ '^[0-9]{4}$' then raise exception 'invalid'; end if;
  if not exists (select 1 from profiles where id = p_id and team_id = t) then raise exception 'not_found'; end if;
  insert into profile_secrets (profile_id, pin_hash) values (p_id, crypt(p_pin, gen_salt('bf', 8)))
    on conflict (profile_id) do update set pin_hash = excluded.pin_hash;
  -- A new PIN signs the profile out everywhere and clears the lockout.
  delete from player_sessions where profile_id = p_id;
  delete from pin_attempts where profile_id = p_id;
end $$;

create function mentor_target_profiles(t uuid, p_ids uuid[]) returns setof profiles
language sql stable security definer set search_path = public as $$
  select * from profiles where team_id = t and archived_at is null and (p_ids is null or id = any (p_ids))
$$;

create function mentor_set_level_control(p_ids uuid[], p_level text, p_change jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare t uuid := require_mentor(); p profiles;
begin
  for p in select * from mentor_target_profiles(t, p_ids) loop
    perform ensure_level_state(p, p_level);
    update level_states set
      override = case when p_change ? 'override' then p_change->>'override' else override end,
      form_locked = case when p_change ? 'formLocked' then (p_change->>'formLocked')::boolean else form_locked end,
      updated_at = now()
    where profile_id = p.id and level_id = p_level;
  end loop;
end $$;

-- Reset keeps every attempt, answer version and timing; it only reopens the level.
create function mentor_reset_level(p_ids uuid[], p_level text) returns void
language plpgsql security definer set search_path = public as $$
declare t uuid := require_mentor();
begin
  update level_states set submitted_at = null, completed_at = null, pointer = null,
      reset_count = reset_count + 1, updated_at = now()
    where level_id = p_level and profile_id in (select id from mentor_target_profiles(t, p_ids));
end $$;

create function mentor_upload_content(p_content jsonb, p_activate boolean) returns uuid
language plpgsql security definer set search_path = public as $$
declare t uuid := require_mentor(); new_id uuid;
begin
  if p_activate then update content_versions set is_active = false where team_id = t and is_active; end if;
  insert into content_versions (team_id, content_version, schema_version, content, is_active, uploaded_by)
    values (t, p_content->>'contentVersion', p_content->>'schemaVersion', p_content, p_activate, auth.uid())
    returning id into new_id;
  return new_id;
end $$;

create function mentor_activate_content(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare t uuid := require_mentor();
begin
  if not exists (select 1 from content_versions where id = p_id and team_id = t) then raise exception 'not_found'; end if;
  update content_versions set is_active = false where team_id = t and is_active and id <> p_id;
  update content_versions set is_active = true where id = p_id;
end $$;

create function mentor_delete_profile(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare t uuid := require_mentor();
begin
  delete from profiles where id = p_id and team_id = t; -- cascades to every child record
end $$;

create function mentor_delete_team_data() returns void
language plpgsql security definer set search_path = public as $$
declare t uuid := require_mentor();
begin
  delete from profiles where team_id = t;
  delete from error_log where team_id = t;
end $$;

create function mentor_list() returns table (user_id uuid, email text)
language sql stable security definer set search_path = public as $$
  select user_id, email from mentors where team_id = require_mentor() order by created_at
$$;

-- The person must already have a Supabase Auth account (invite them from the dashboard).
create function mentor_add(p_email text) returns void
language plpgsql security definer set search_path = public, auth as $$
declare t uuid := require_mentor(); u uuid;
begin
  select id into u from auth.users where lower(email) = lower(p_email);
  if u is null then raise exception 'not_found'; end if;
  insert into mentors (user_id, team_id, email) values (u, t, lower(p_email))
    on conflict (user_id) do nothing;
end $$;

-- ---------------------------------------------------------------- grants

revoke all on all tables in schema public from anon;
revoke insert, update, delete on all tables in schema public from authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;

grant execute on function public_profiles(text), public_active_content(text), player_login(uuid, text, text),
  player_logout(text), player_state(text), player_write(text, jsonb), report_error(text, text, jsonb)
  to anon, authenticated;

grant execute on function my_team(), mentor_create_profile(text, text, text), mentor_update_profile(uuid, text, text, boolean),
  mentor_set_pin(uuid, text), mentor_set_level_control(uuid[], text, jsonb), mentor_reset_level(uuid[], text),
  mentor_upload_content(jsonb, boolean), mentor_activate_content(uuid), mentor_delete_profile(uuid),
  mentor_delete_team_data(), mentor_list(), mentor_add(text)
  to authenticated;
