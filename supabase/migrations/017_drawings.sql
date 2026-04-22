-- Per-user claimed drawings produced by the drawit kiosk game.
-- Rows are written exclusively by the claim-drawing edge function (service role)
-- as part of the atomic token-claim flow defined in 015_claim_tokens.sql.
-- Storage moves between temp-drawings and drawings buckets happen inside the
-- same edge function — Postgres triggers cannot perform storage operations.

BEGIN;

-- ------------------------------------------------------------
-- 1. drawings table
-- ------------------------------------------------------------

create table drawings (
  id         uuid        primary key default gen_random_uuid(),
  owner_id   uuid        not null references "user"(id) on delete cascade,
  org_id     uuid        not null references organization(id) on delete cascade,
  image_path text        not null,
  prompt     text,
  created_at timestamptz not null default now(),

  -- Mirrors the game_score pattern: (owner_id, org_id) must refer to the same
  -- "user" row, so a buggy or malicious edge-function call can't attribute a
  -- drawing across orgs. Relies on UNIQUE(id, org_id) from 001_initial_schema.sql.
  foreign key (owner_id, org_id) references "user"(id, org_id)
);

create index idx_drawings_owner_id    on drawings (owner_id);
create index idx_drawings_org_id      on drawings (org_id);
create index idx_drawings_org_gallery on drawings (org_id, created_at desc);

alter table drawings enable row level security;

-- Org members can read every drawing in their org — powers both the kiosk's
-- community gallery and each user's personal gallery view.
create policy "org_members_can_read_drawings"
  on drawings for select
  to authenticated
  using (org_id = public.get_user_org_id());

-- Owners can delete their own drawings from their mobile profile.
-- No INSERT/UPDATE policy: writes happen only via the claim-drawing edge
-- function using the service role, matching the 015/016 convention.
create policy "owners_can_delete_own_drawings"
  on drawings for delete
  to authenticated
  using (owner_id = auth.uid());

-- ------------------------------------------------------------
-- 2. Storage buckets
-- ------------------------------------------------------------
-- Both buckets are private; all reads go through signed URLs or the service role.

insert into storage.buckets (id, name, public)
  values ('drawings', 'drawings', false)
  on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
  values ('temp-drawings', 'temp-drawings', false)
  on conflict (id) do nothing;

-- ------------------------------------------------------------
-- 3. Storage RLS: temp-drawings
-- ------------------------------------------------------------
-- Kiosk uploads only, into its own org folder. Reads and deletes run as the
-- service role from inside claim-drawing, which bypasses these policies.

drop policy if exists "kiosk_can_upload_temp_drawings" on storage.objects;

create policy "kiosk_can_upload_temp_drawings"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'temp-drawings'
    and coalesce((auth.jwt() -> 'app_metadata' ->> 'is_kiosk')::boolean, false) = true
    and (storage.foldername(name))[1] = nullif(auth.jwt() -> 'app_metadata' ->> 'org_id', '')
  );

-- ------------------------------------------------------------
-- 4. Storage RLS: drawings (permanent bucket)
-- ------------------------------------------------------------
-- Anyone authenticated can generate a signed URL for a path they already know
-- from the drawings table (which is org-scoped via DB RLS above). Owners can
-- delete their own files; writes happen via service role only.

drop policy if exists "authenticated_can_read_drawings" on storage.objects;
drop policy if exists "owners_can_delete_drawings" on storage.objects;

create policy "authenticated_can_read_drawings"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'drawings');

create policy "owners_can_delete_drawings"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'drawings'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

COMMIT;
