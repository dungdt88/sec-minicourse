-- Launch check (read only). Paste into Supabase → SQL Editor on the production project after
-- `supabase db push` and `pnpm bootstrap`, before the children start.
-- Every "children's data" row must show 0. The setup rows show what bootstrap created.

select 'children''s data' as kind, t.name, t.n, case when t.n = 0 then 'ok' else 'NOT EMPTY' end as check
from (
  select 'answer_versions (answers)' as name, count(*) as n from answer_versions
  union all select 'quiz_attempts (attempts)', count(*) from quiz_attempts
  union all select 'section_timings (timings)', count(*) from section_timings
  -- level progress, and the "Bình vừa xong Màn 2!" news, which is read from completed levels
  union all select 'level_states (progress, news)', count(*) from level_states
  union all select 'player_sessions (devices signed in)', count(*) from player_sessions
  union all select 'pin_attempts', count(*) from pin_attempts
  union all select 'error_log', count(*) from error_log
) t
union all
select 'setup', 'teams: ' || string_agg(name || ' (' || slug || ')', ', '), count(*), case when count(*) = 1 then 'ok' else 'check' end
from teams
union all
select 'setup', 'mentors: ' || coalesce(string_agg(email, ', '), '—'), count(*),
       case when count(*) >= 1 and bool_and(email not like '%@local.test') then 'ok' else 'check' end
from mentors
union all
select 'setup', 'auth users: ' || coalesce(string_agg(email, ', '), '—'), count(*),
       case when bool_and(email not like '%@local.test') is not false then 'ok' else 'TEST USER' end
from auth.users
union all
select 'setup', 'profiles: ' || coalesce(string_agg(display_name || ' ' || avatar, ', ' order by created_at), '—'), count(*),
       case when count(*) = 4 then 'ok' else 'check' end
from profiles where archived_at is null
union all
select 'setup', 'active content: ' || coalesce(max(content_version) filter (where is_active), '—'), count(*) filter (where is_active),
       case when count(*) filter (where is_active) = 1 then 'ok' else 'check' end
from content_versions;
