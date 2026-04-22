-- ============================================
-- FIX: Enforce storage_path ownership on gesture_image and cropped_image
-- ============================================
--
-- Why:
-- - Edge functions may use service-role storage deletes based on DB-stored paths.
-- - Without path ownership checks, a user could store an out-of-scope path and
--   potentially trigger deletion of another user's object.
--
-- What this migration does:
-- 1) Tightens INSERT/UPDATE RLS checks to require:
--      storage_path LIKE org_id/owner_id/%
-- 2) Adds table CHECK constraints (NOT VALID) that enforce the same format for
--    all future writes while avoiding failures from legacy rows.

BEGIN;

-- ------------------------------------------------------------
-- 1. Tighten gesture_image write policies
-- ------------------------------------------------------------

DROP POLICY IF EXISTS "Users can create gesture images in their org" ON public.gesture_image;
DROP POLICY IF EXISTS "Users can update their own gesture images" ON public.gesture_image;

CREATE POLICY "Users can create gesture images in their org"
ON public.gesture_image FOR INSERT
TO authenticated
WITH CHECK (
    owner_id = auth.uid()
    AND org_id = public.get_user_org_id()
    AND storage_path LIKE (org_id::text || '/' || owner_id::text || '/%')
);

CREATE POLICY "Users can update their own gesture images"
ON public.gesture_image FOR UPDATE
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (
    owner_id = auth.uid()
    AND org_id = public.get_user_org_id()
    AND storage_path LIKE (org_id::text || '/' || owner_id::text || '/%')
);

-- ------------------------------------------------------------
-- 2. Tighten cropped_image write policies
-- ------------------------------------------------------------

DROP POLICY IF EXISTS "Users can create cropped images in their org" ON public.cropped_image;
DROP POLICY IF EXISTS "Users can update their own cropped images" ON public.cropped_image;

CREATE POLICY "Users can create cropped images in their org"
ON public.cropped_image FOR INSERT
TO authenticated
WITH CHECK (
    owner_id = auth.uid()
    AND org_id = public.get_user_org_id()
    AND storage_path LIKE (org_id::text || '/' || owner_id::text || '/%')
);

CREATE POLICY "Users can update their own cropped images"
ON public.cropped_image FOR UPDATE
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (
    owner_id = auth.uid()
    AND org_id = public.get_user_org_id()
    AND storage_path LIKE (org_id::text || '/' || owner_id::text || '/%')
);

-- ------------------------------------------------------------
-- 3. Add table-level constraints for all future writes
-- ------------------------------------------------------------

ALTER TABLE public.gesture_image
  DROP CONSTRAINT IF EXISTS gesture_image_storage_path_owner_prefix_chk;

ALTER TABLE public.gesture_image
  ADD CONSTRAINT gesture_image_storage_path_owner_prefix_chk
  CHECK (storage_path LIKE (org_id::text || '/' || owner_id::text || '/%')) NOT VALID;

ALTER TABLE public.cropped_image
  DROP CONSTRAINT IF EXISTS cropped_image_storage_path_owner_prefix_chk;

ALTER TABLE public.cropped_image
  ADD CONSTRAINT cropped_image_storage_path_owner_prefix_chk
  CHECK (storage_path LIKE (org_id::text || '/' || owner_id::text || '/%')) NOT VALID;

COMMIT;
