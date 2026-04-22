-- Kiosk sessions have no row in the "user" table, so public.get_user_org_id()
-- returns null for them and the `org_members_can_read_drawings` policy from 017
-- never matches. This adds a parallel SELECT policy that reads org_id straight
-- from the kiosk JWT's app_metadata — matching the pattern used by the INSERT
-- policy on claim_tokens in 015.

BEGIN;

create policy "kiosk_can_read_drawings"
  on drawings for select
  to authenticated
  using (
    coalesce((auth.jwt() -> 'app_metadata' ->> 'is_kiosk')::boolean, false) = true
    and org_id = nullif(auth.jwt() -> 'app_metadata' ->> 'org_id', '')::uuid
  );

COMMIT;
