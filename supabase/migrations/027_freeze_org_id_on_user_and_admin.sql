-- 027: Freeze org_id (and id) on "user" and admin rows for non-service callers.
--
-- WHAT IT FIXES
--   001's "Users can update own profile" (ON "user") and "Admins can update own
--   profile" (ON admin) only check id = auth.uid(). Nothing stopped a user or
--   admin changing their own org_id, and every org-scoped RLS policy
--   (get_user_org_id(), admin org subqueries) trusts that column, so one UPDATE
--   gave cross-org read access.
--
-- HOW
--   BEFORE UPDATE triggers raise when org_id or id changes, unless the caller is
--   the service role or there is no JWT context at all (direct DB / migration /
--   dashboard SQL access).
--
-- CLIENT BEHAVIOUR
--   Audited src/ (read-only): no client update payload changes org_id.
--   - profileService.ts / userRegistrationAuth.ts update "user" without org_id.
--   - userRegistrationAuth upsert (onConflict id) sends org_id; it only passes if
--     it equals the stored value (the minimal-user insert already set it).
--   - The 001 policy "Admins can update users in their org" is not used to move
--     users between orgs anywhere in src/. If it is ever needed, do it via the
--     service role.
--
-- NOT CHANGED
--   INSERT policies ("Users can create own profile", "Kiosk can create users in
--   their org") are left as is; the insert side is being redesigned separately.
--
-- DEPLOY ORDERING: none; safe to apply independently.

BEGIN;

create or replace function public.prevent_org_id_change()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_claims text := current_setting('request.jwt.claims', true);
  v_role   text;
begin
  -- No JWT context (direct DB access, migrations): allow.
  if v_claims is null or v_claims = '' then
    return new;
  end if;

  begin
    v_role := v_claims::jsonb ->> 'role';
  exception when others then
    v_role := null;
  end;

  -- Service role is trusted.
  if v_role = 'service_role' or auth.role() = 'service_role' then
    return new;
  end if;

  if new.id is distinct from old.id then
    raise exception 'id cannot be changed on %', tg_table_name
      using errcode = '42501';
  end if;

  if new.org_id is distinct from old.org_id then
    raise exception 'org_id cannot be changed on %', tg_table_name
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists user_freeze_org_id on public."user";
create trigger user_freeze_org_id
  before update on public."user"
  for each row
  execute function public.prevent_org_id_change();

drop trigger if exists admin_freeze_org_id on public.admin;
create trigger admin_freeze_org_id
  before update on public.admin
  for each row
  execute function public.prevent_org_id_change();

COMMIT;
