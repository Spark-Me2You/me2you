-- Lifecycle enum for claim tokens
create type claim_status as enum ('pending', 'claimed', 'expired');

create table claim_tokens (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organization(id) on delete cascade,
  payload     jsonb not null,
  status      claim_status not null default 'pending',
  claimed_by  uuid references auth.users(id) on delete set null,
  expires_at  timestamptz not null default (now() + interval '5 minutes'),
  created_at  timestamptz not null default now()
);

create index idx_claim_tokens_org_id       on claim_tokens (org_id);
create index idx_claim_tokens_status       on claim_tokens (status);
create index idx_claim_tokens_payload_type on claim_tokens ((payload->>'type'));

alter table claim_tokens enable row level security;

-- Kiosk inserts tokens for its own org.
-- org_id is read from JWT app_metadata — the kiosk has no row in any table.
create policy "kiosk_can_insert_claim_tokens"
  on claim_tokens for insert
  to authenticated
  with check (
    coalesce((auth.jwt() -> 'app_metadata' ->> 'is_kiosk')::boolean, false) = true
    and org_id = nullif(auth.jwt() -> 'app_metadata' ->> 'org_id', '')::uuid
  );

-- Users can read pending, non-expired tokens for their own org.
-- Reuses the SECURITY DEFINER helper added in 005_fix_user_organization_rls_recursion.sql.
create policy "user_can_read_pending_claim_tokens"
  on claim_tokens for select
  to authenticated
  using (
    status = 'pending'
    and expires_at > now()
    and org_id = public.get_user_org_id()
  );

-- No UPDATE policy: status transitions happen only via the execute-claim
-- edge function using the service role key, which bypasses RLS.

-- Enable realtime so the kiosk can subscribe to UPDATE events on its token rows.
alter publication supabase_realtime add table claim_tokens;
