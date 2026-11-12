-- 031: Validate kiosk-supplied payload in handle_game_score_claim().
--
-- WHAT IT FIXES
--   016's trigger function cast payload.data.score to integer and took game_id
--   verbatim from a kiosk-supplied payload. A non-numeric score raised and
--   failed the whole claim; arbitrary game ids and huge/negative scores were
--   stored.
--
-- HOW (behaviour otherwise identical to 016; no later migration redefines it.
--   025's claim_candy_reward inserts into game_score directly, not via this
--   trigger, and is not changed here)
--   - score must be a plain integer string (optional leading minus); otherwise
--     the insert is skipped and the claim still succeeds.
--   - score outside 0..100000 skips the insert.
--   - game_id must be one registered in src/features/games/config/gamesConfig.ts:
--       flapflap, drawit, gumballslice
--     otherwise the insert is skipped. Add new game ids here (new migration)
--     when registering a game.
--   - set search_path = public.
--
-- DEPLOY ORDERING: none.

BEGIN;

create or replace function public.handle_game_score_claim()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_game_id   text;
  v_score_txt text;
  v_score     integer;
begin
  if new.payload->>'type' = 'game_score' and new.claimed_by is not null then
    v_game_id   := new.payload->'data'->>'game_id';
    v_score_txt := new.payload->'data'->>'score';

    -- Registered game ids only (gamesConfig.ts GAMES_REGISTRY).
    if v_game_id is null or v_game_id not in ('flapflap', 'drawit', 'gumballslice') then
      return new;
    end if;

    -- Reject non-numeric or oversized text before casting (avoids overflow).
    if v_score_txt is null or v_score_txt !~ '^-?[0-9]{1,9}$' then
      return new;
    end if;

    v_score := v_score_txt::integer;
    if v_score < 0 or v_score > 100000 then
      return new;
    end if;

    insert into public.game_score (owner_id, org_id, game_id, score, metadata)
    values (
      new.claimed_by,
      new.org_id,
      v_game_id,
      v_score,
      new.payload->'data'
    );
  end if;
  return new;
end;
$$;

COMMIT;
