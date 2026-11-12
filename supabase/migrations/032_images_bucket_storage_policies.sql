-- 032: Version the storage.objects policies for the 'images' bucket.
--
-- These policies were created by hand in the dashboard and existed only as
-- text in supabase/policies.md. This migration recreates them idempotently
-- EXACTLY as documented there, so a fresh environment matches production.
-- Behaviour-preserving: nothing is tightened here.
--
-- Note: "Users can view public org images" lets any org member read any object
-- under their org's folder, regardless of gesture_image/cropped_image.is_public.
--
-- FOLLOW-UP: consider tightening "Users can view public org images" so SELECT
-- is allowed only when the object is the caller's own, or a matching
-- gesture_image / cropped_image row (storage_path = name) has is_public = true
-- in the caller's org. Needs a client audit first (hub and gallery signed URLs).
--
-- DEPLOY ORDERING: none. Source of truth is now this file (policies.md points here).

BEGIN;

drop policy if exists "Users can upload own images" on storage.objects;
create policy "Users can upload own images"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'images'
  and (storage.foldername(name))[1] in (
    select org_id::text from "user" where id = auth.uid()
  )
  and (storage.foldername(name))[2] = auth.uid()::text
);

drop policy if exists "Users can view own images" on storage.objects;
create policy "Users can view own images"
on storage.objects for select
to authenticated
using (
  bucket_id = 'images'
  and (storage.foldername(name))[1] in (
    select org_id::text from "user" where id = auth.uid()
  )
  and (storage.foldername(name))[2] = auth.uid()::text
);

drop policy if exists "Users can delete own images" on storage.objects;
create policy "Users can delete own images"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'images'
  and (storage.foldername(name))[1] in (
    select org_id::text from "user" where id = auth.uid()
  )
  and (storage.foldername(name))[2] = auth.uid()::text
);

drop policy if exists "Users can view public org images" on storage.objects;
create policy "Users can view public org images"
on storage.objects for select
to authenticated
using (
  bucket_id = 'images'
  and (storage.foldername(name))[1] in (
    select org_id::text from "user" where id = auth.uid()
  )
);

drop policy if exists "Admins can view org images" on storage.objects;
create policy "Admins can view org images"
on storage.objects for select
to authenticated
using (
  bucket_id = 'images'
  and (storage.foldername(name))[1] in (
    select org_id::text from admin where id = auth.uid()
  )
);

drop policy if exists "Kiosk can view images in their org" on storage.objects;
create policy "Kiosk can view images in their org"
on storage.objects for select
to authenticated
using (
  bucket_id = 'images'
  and (storage.foldername(name))[1] = (auth.jwt() -> 'app_metadata' ->> 'org_id')::text
  and (auth.jwt() -> 'app_metadata' ->> 'is_kiosk')::boolean = true
);

COMMIT;
