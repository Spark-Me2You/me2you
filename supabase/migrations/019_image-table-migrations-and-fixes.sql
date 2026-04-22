-- Migration: 
--   1. Remove deprecated jaw/chin landmark columns from cropped_image
--   2. Migrate all rows from image table into gesture_image and drop image table
-- NOTE: image.cropped_path and image.cropped_at have no equivalent in gesture_image and will be lost.

-- ============================================================
-- Part 1: Remove deprecated columns from cropped_image
-- ============================================================

ALTER TABLE public.cropped_image
  DROP COLUMN IF EXISTS chin_point,
  DROP COLUMN IF EXISTS left_jaw_point,
  DROP COLUMN IF EXISTS right_jaw_point;

-- ============================================================
-- Part 2: Migrate image -> gesture_image and drop image table
-- ============================================================

-- Step 1: Verify no storage_path conflicts exist between the two tables.
DO $$
DECLARE
  conflict_count integer;
BEGIN
  SELECT COUNT(*) INTO conflict_count
  FROM public.image i
  WHERE EXISTS (
    SELECT 1 FROM public.gesture_image g WHERE g.storage_path = i.storage_path
  );

  IF conflict_count > 0 THEN
    RAISE EXCEPTION '% conflicting storage_path value(s) found. Aborting migration.', conflict_count;
  END IF;
END;
$$;

-- Step 2: Insert all rows from image into gesture_image.
INSERT INTO public.gesture_image (
  id,
  owner_id,
  org_id,
  storage_path,
  category,
  is_public,
  created_at,
  updated_at
)
SELECT
  id,
  owner_id,
  org_id,
  storage_path,
  category,
  COALESCE(is_public, false),
  created_at,
  created_at  -- no updated_at in image, fall back to created_at
FROM public.image;

-- Step 3: Drop indexes on image.
DROP INDEX IF EXISTS public.idx_image_owner_id;
DROP INDEX IF EXISTS public.idx_image_org_id;
DROP INDEX IF EXISTS public.idx_image_cropped_null;

-- Step 4: Drop the image table.
DROP TABLE IF EXISTS public.image;