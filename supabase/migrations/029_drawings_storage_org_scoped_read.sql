-- 029: Scope storage reads on the drawings bucket to the caller's org.
--
-- WHAT IT FIXES
--   017's "authenticated_can_read_drawings" on storage.objects was
--   using (bucket_id = 'drawings'), so any authenticated user in any org could
--   read or list every drawing.
--
-- HOW
--   A read is allowed only when a public.drawings row has image_path equal to
--   storage.objects.name and belongs to the caller's org: get_user_org_id() for
--   mobile users, or the kiosk JWT org (is_kiosk true) for kiosk sessions,
--   same expressions as 018/021. claim-drawing writes image_path as
--   '<user_id>/<drawing_id>.png', which is also the object name.
--   The inner select on drawings is itself RLS-filtered (017 org policy, 018
--   kiosk policy), so the org check is enforced twice.
--   "owners_can_delete_drawings" (017) is untouched.
--
-- CLIENT BEHAVIOUR
--   src/core/supabase/drawingsGallery.ts only calls createSignedUrl(image_path)
--   for paths taken from rows it just read from drawings under RLS, so every
--   path it signs has a visible, same-org drawings row and still passes.
--
-- DEPLOY ORDERING: none.

BEGIN;

drop policy if exists "authenticated_can_read_drawings" on storage.objects;
drop policy if exists "org_members_can_read_drawings_storage" on storage.objects;

create policy "org_members_can_read_drawings_storage"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'drawings'
    and exists (
      select 1
      from public.drawings d
      where d.image_path = storage.objects.name
        and (
          d.org_id = public.get_user_org_id()
          or (
            coalesce((auth.jwt() -> 'app_metadata' ->> 'is_kiosk')::boolean, false) = true
            and d.org_id = nullif(auth.jwt() -> 'app_metadata' ->> 'org_id', '')::uuid
          )
        )
    )
  );

COMMIT;
