-- Children's code optional (owner's request): teams.settings.requirePin, default off.
create or replace function sec_minicourse.player_login(p_profile_id uuid, p_pin text, p_device text)
returns jsonb language plpgsql security definer set search_path = sec_minicourse, extensions, pg_temp as $$
declare
  p profiles;
  failures int;
  token text;
begin
  select * into p from profiles where id = p_profile_id and archived_at is null;
  if not found then return jsonb_build_object('error', 'not_found'); end if;

  -- The mentor decides whether children need their code (teams.settings.requirePin, default off):
  -- without it a child taps their picture and is in.
  if coalesce((select (settings->>'requirePin')::boolean from teams where id = p.team_id), false) then
    select count(*) into failures from pin_attempts
      where profile_id = p.id and not success and created_at > now() - interval '15 minutes';
    if failures >= 5 then return jsonb_build_object('error', 'rate_limited'); end if;

    if not exists (select 1 from profile_secrets s where s.profile_id = p.id and s.pin_hash = crypt(p_pin, s.pin_hash)) then
      insert into pin_attempts (profile_id, success) values (p.id, false);
      return jsonb_build_object('error', 'wrong_pin');
    end if;
  end if;

  insert into pin_attempts (profile_id, success) values (p.id, true);
  delete from pin_attempts where created_at < now() - interval '1 day';
  token := encode(gen_random_bytes(32), 'hex');
  insert into player_sessions (token_hash, profile_id, team_id, device_type)
    values (encode(digest(token, 'sha256'), 'hex'), p.id, p.team_id, p_device);
  return jsonb_build_object('token', token);
end $$;

-- Profiles can be created without a code; a random one is stored so turning codes on later
-- never leaves a profile open. The mentor sets a real code in "Các con" when needed.
create or replace function sec_minicourse.mentor_create_profile(p_name text, p_avatar text, p_pin text) returns uuid
language plpgsql security definer set search_path = sec_minicourse, extensions, pg_temp as $$
declare t uuid := require_mentor(); new_id uuid; v_pin text := p_pin;
begin
  if v_pin is null or v_pin = '' then v_pin := lpad((floor(random() * 10000))::int::text, 4, '0'); end if;
  if v_pin !~ '^[0-9]{4}$' then raise exception 'invalid'; end if;
  insert into profiles (team_id, display_name, avatar) values (t, p_name, p_avatar) returning id into new_id;
  insert into profile_secrets (profile_id, pin_hash) values (new_id, crypt(v_pin, gen_salt('bf', 8)));
  return new_id;
end $$;
