-- Append-only record of game runs claimed by a student via the claim-token system.
-- Rows are written exclusively by the handle_game_score_claim trigger below,
-- which fires inside the same transaction as execute-claim's UPDATE on claim_tokens.
-- Because execute-claim uses the service role client the trigger also runs as service
-- role, bypassing RLS — no INSERT policy is defined.

create table game_score (
  id         uuid        primary key default gen_random_uuid(),
  owner_id   uuid        not null references "user"(id) on delete cascade,
  org_id     uuid        not null references organization(id) on delete cascade,
  game_id    text        not null,
  score      integer     not null,
  metadata   jsonb,
  created_at timestamptz not null default now(),

  -- Enforces that owner_id and org_id refer to the same row in "user".
  -- Relies on the UNIQUE(id, org_id) constraint introduced in 001_initial_schema.sql.
  foreign key (owner_id, org_id) references "user"(id, org_id)
);

create index idx_game_score_owner_id         on game_score (owner_id);
create index idx_game_score_org_id           on game_score (org_id);
create index idx_game_score_game_id          on game_score (game_id);
create index idx_game_score_leaderboard      on game_score (org_id, game_id, score desc);

alter table game_score enable row level security;

-- Authenticated users in the same org can read scores (enables leaderboards).
-- No INSERT/UPDATE/DELETE policies: the table is write-only from the client's
-- perspective, matching the pattern established in 015_claim_tokens.sql.
create policy "org_members_can_read_game_scores"
  on game_score for select
  to authenticated
  using (org_id = public.get_user_org_id());

-- Trigger function: fires when a claim_tokens row transitions from pending → claimed.
-- Only inserts a game_score row when payload.type = 'game_score'.
-- owner_id and org_id are read from the claim row itself — never from the payload —
-- so a malformed payload cannot forge attribution.
create or replace function public.handle_game_score_claim()
returns trigger
language plpgsql
as $$
begin
  if new.payload->>'type' = 'game_score' and new.claimed_by is not null then
    insert into public.game_score (owner_id, org_id, game_id, score, metadata)
    values (
      new.claimed_by,
      new.org_id,
      new.payload->'data'->>'game_id',
      (new.payload->'data'->>'score')::integer,
      new.payload->'data'
    );
  end if;
  return new;
end;
$$;

-- WHEN clause restricts firing to the single pending → claimed transition,
-- so an accidental re-UPDATE of an already-claimed row is a no-op.
create trigger game_score_on_claim
  after update of status on public.claim_tokens
  for each row
  when (old.status = 'pending' and new.status = 'claimed')
  execute function public.handle_game_score_claim();
