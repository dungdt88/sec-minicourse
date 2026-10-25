-- Team progress for the player app: friends' level progress and the team's candy total, so a
-- child can see how the team is doing. Shares only names, avatars, completed levels and the
-- number of first-try quiz answers that were right (team total). Never answers or per-child
-- scores. The mentor can switch it off (teams.settings.teamProgress = false).

create function player_team_progress(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  p profiles;
  on_ boolean;
begin
  p := session_profile(p_token);
  select coalesce((settings->>'teamProgress')::boolean, true) into on_ from teams where id = p.team_id;
  if not on_ then return jsonb_build_object('enabled', false); end if;
  return jsonb_build_object(
    'enabled', true,
    'friends', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', f.id, 'displayName', f.display_name, 'avatar', f.avatar,
        'completed', coalesce((select jsonb_agg(jsonb_build_object('levelId', l.level_id, 'completedAt', l.completed_at))
                               from level_states l where l.profile_id = f.id and l.completed_at is not null), '[]'))
        order by f.created_at)
      from profiles f where f.team_id = p.team_id and f.archived_at is null), '[]'),
    'teamCandies', (
      select count(*) from quiz_attempts q
      join profiles f on f.id = q.profile_id and f.archived_at is null
      where q.team_id = p.team_id and q.attempt_no = 1 and q.correct)
  );
end $$;

grant execute on function player_team_progress(text) to anon, authenticated;
