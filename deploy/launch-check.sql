-- Launch check (read only), for Supabase → SQL Editor on the production project, after
-- deploy/supabase-schema.sql and `pnpm bootstrap`, before the children start. Same check as
-- `pnpm launch-check`. Every "children's data" row must show 0, and "ours in public" too:
-- the app lives in its own schema, sec_minicourse, and the project is shared with other apps.

select 'children''s data' as kind, t.name, t.n, case when t.n = 0 then 'ok' else 'NOT EMPTY' end as check
from (
  select 'answer_versions (answers)' as name, count(*) as n from sec_minicourse.answer_versions
  union all select 'quiz_attempts (attempts)', count(*) from sec_minicourse.quiz_attempts
  union all select 'section_timings (timings)', count(*) from sec_minicourse.section_timings
  -- level progress, and the "Bình vừa xong Màn 2!" news, which is read from completed levels
  union all select 'level_states (progress, news)', count(*) from sec_minicourse.level_states
  union all select 'player_sessions (devices signed in)', count(*) from sec_minicourse.player_sessions
  union all select 'pin_attempts', count(*) from sec_minicourse.pin_attempts
  union all select 'error_log', count(*) from sec_minicourse.error_log
) t
union all
-- Nothing of this app in public: tables or functions there with this app's names.
select 'ours in public', 'tables and functions in public named like this app''s', count(*),
       case when count(*) = 0 then 'ok' else 'CHECK' end
from (
  select table_name as name from information_schema.tables
  where table_schema = 'public' and table_name in (select table_name from information_schema.tables where table_schema = 'sec_minicourse')
  union all
  select routine_name from information_schema.routines
  where routine_schema = 'public' and routine_name in (select routine_name from information_schema.routines where routine_schema = 'sec_minicourse')
) o
union all
select 'setup', 'teams: ' || string_agg(name || ' (' || slug || ')', ', '), count(*), case when count(*) = 1 then 'ok' else 'check' end
from sec_minicourse.teams
union all
select 'setup', 'mentors: ' || coalesce(string_agg(email, ', '), '—'), count(*),
       case when count(*) >= 1 and bool_and(email not like '%@local.test') then 'ok' else 'check' end
from sec_minicourse.mentors
union all
-- The project's accounts belong to every app in it: counted, not listed.
select 'setup', 'auth accounts in the project (all apps), test accounts among them', count(*) filter (where email like '%@local.test'),
       case when count(*) filter (where email like '%@local.test') = 0 then 'ok' else 'TEST USER' end
from auth.users
union all
select 'setup', 'profiles: ' || coalesce(string_agg(display_name || ' ' || avatar, ', ' order by created_at), '—'), count(*),
       case when count(*) = 4 then 'ok' else 'check' end
from sec_minicourse.profiles where archived_at is null
union all
select 'setup', 'active content: ' || coalesce(max(content_version) filter (where is_active), '—'), count(*) filter (where is_active),
       case when count(*) filter (where is_active) = 1 then 'ok' else 'check' end
from sec_minicourse.content_versions;
