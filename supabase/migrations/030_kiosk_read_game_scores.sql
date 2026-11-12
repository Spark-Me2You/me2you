-- 030: Let kiosk sessions read their org's game_score rows.
--
-- WHAT IT FIXES
--   016's only SELECT policy uses get_user_org_id(), which is NULL for kiosk
--   sessions (no "user" row), so the kiosk leaderboard query in
--   gameScoreService.ts returned nothing.
--
-- HOW
--   Adds kiosk_can_read_game_scores, matching the kiosk JWT expression used in
--   018/021.
--
-- NOTES
--   The leaderboard does not embed "user": it selects game_score rows, then
--   runs a separate select on "user" (id, name). Kiosk already has
--   "Kiosk can view users in their org" (003/004) on "user", so that second
--   query works without further changes.
--
-- DEPLOY ORDERING: none.

BEGIN;

drop policy if exists "kiosk_can_read_game_scores" on game_score;

create policy "kiosk_can_read_game_scores"
  on game_score for select
  to authenticated
  using (
    coalesce((auth.jwt() -> 'app_metadata' ->> 'is_kiosk')::boolean, false) = true
    and org_id = nullif(auth.jwt() -> 'app_metadata' ->> 'org_id', '')::uuid
  );

COMMIT;
