begin;

create table messages (
  id           uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references "user"(id) on delete cascade,
  to_user_id   uuid not null references "user"(id) on delete cascade,
  org_id       uuid not null references organization(id) on delete cascade,
  body         text not null check (char_length(body) between 1 and 500),
  created_at   timestamptz not null default now(),
  -- composite FKs prevent cross-org attribution forging (matches 016/017 pattern)
  foreign key (from_user_id, org_id) references "user"(id, org_id),
  foreign key (to_user_id, org_id)   references "user"(id, org_id)
);

create index idx_messages_to_user_created on messages (to_user_id, created_at desc);
create index idx_messages_org_id          on messages (org_id);

alter table messages enable row level security;

-- Recipients can read their own incoming messages, scoped to their org.
-- Reuses the SECURITY DEFINER helper added in 005_fix_user_organization_rls_recursion.sql.
create policy "user_can_read_own_messages"
  on messages for select to authenticated
  using (
    to_user_id = auth.uid()
    and org_id = public.get_user_org_id()
  );

-- No INSERT/UPDATE/DELETE policy: writes happen only via the claim-message
-- edge function using the service role key, which bypasses RLS.

commit;
