-- Whether a profile has a code the mentor chose. A profile created without one has a random
-- placeholder, so with codes switched on the child cannot get in until the mentor sets a code;
-- the console and the child's code screen say so instead of a silent "wrong code".

alter table sec_minicourse.profiles add column pin_set boolean not null default true;

drop function sec_minicourse.public_profiles(text);
create function sec_minicourse.public_profiles(p_team_slug text)
returns table (id uuid, display_name text, avatar text, pin_set boolean)
language sql stable security definer set search_path = sec_minicourse, extensions, pg_temp as $$
  select p.id, p.display_name, p.avatar, p.pin_set
  from profiles p join teams t on t.id = p.team_id
  where t.slug = p_team_slug and p.archived_at is null
  order by p.created_at
$$;
revoke execute on function sec_minicourse.public_profiles(text) from public;
grant execute on function sec_minicourse.public_profiles(text) to anon, authenticated;

create or replace function sec_minicourse.mentor_create_profile(p_name text, p_avatar text, p_pin text) returns uuid
language plpgsql security definer set search_path = sec_minicourse, extensions, pg_temp as $$
declare t uuid := require_mentor(); new_id uuid; v_pin text := p_pin;
begin
  if v_pin is null or v_pin = '' then v_pin := lpad((floor(random() * 10000))::int::text, 4, '0'); end if;
  -- pin_set says whether the mentor chose this code (false: the random placeholder above).
  if v_pin !~ '^[0-9]{4}$' then raise exception 'invalid'; end if;
  insert into profiles (team_id, display_name, avatar, pin_set) values (t, p_name, p_avatar, coalesce(p_pin, '') <> '')
    returning id into new_id;
  insert into profile_secrets (profile_id, pin_hash) values (new_id, crypt(v_pin, gen_salt('bf', 8)));
  return new_id;
end $$;

create or replace function sec_minicourse.mentor_set_pin(p_id uuid, p_pin text) returns void
language plpgsql security definer set search_path = sec_minicourse, extensions, pg_temp as $$
declare t uuid := require_mentor();
begin
  if p_pin !~ '^[0-9]{4}$' then raise exception 'invalid'; end if;
  if not exists (select 1 from profiles where id = p_id and team_id = t) then raise exception 'not_found'; end if;
  insert into profile_secrets (profile_id, pin_hash) values (p_id, crypt(p_pin, gen_salt('bf', 8)))
    on conflict (profile_id) do update set pin_hash = excluded.pin_hash;
  -- A new PIN signs the profile out everywhere and clears the lockout.
  delete from player_sessions where profile_id = p_id;
  delete from pin_attempts where profile_id = p_id;
  update profiles set pin_set = true where id = p_id;
end $$;
