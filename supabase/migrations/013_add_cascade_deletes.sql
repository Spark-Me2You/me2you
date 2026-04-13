-- ============================================
-- FIX: Missing cascade delete constraints on gesture_image and cropped_image
-- ============================================

-- PROBLEM:
-- Migration 009 created gesture_image and cropped_image tables with foreign keys
-- that lack ON DELETE CASCADE clauses:
--   FOREIGN KEY (owner_id) REFERENCES auth.users(id)
--   FOREIGN KEY (owner_id) REFERENCES public.user(id)
--   FOREIGN KEY (org_id) REFERENCES public.organization(id)
--
-- This prevents deletion of auth users when they have associated images.
-- Error: "Failed to delete selected users: Database error deleting user"

-- SOLUTION:
-- Drop the existing foreign key constraints and recreate them with ON DELETE CASCADE.
-- This allows proper cascading deletion:
--   auth.users deleted → public.user deleted → gesture_image/cropped_image deleted

BEGIN;

-- ------------------------------------------------------------
-- 1. Drop existing foreign key constraints on gesture_image
-- ------------------------------------------------------------

ALTER TABLE public.gesture_image
  DROP CONSTRAINT IF EXISTS gesture_image_owner_auth_fk,
  DROP CONSTRAINT IF EXISTS gesture_image_owner_user_fk,
  DROP CONSTRAINT IF EXISTS gesture_image_org_fk;

-- ------------------------------------------------------------
-- 2. Recreate gesture_image foreign keys with ON DELETE CASCADE
-- ------------------------------------------------------------

ALTER TABLE public.gesture_image
  ADD CONSTRAINT gesture_image_owner_auth_fk
    FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD CONSTRAINT gesture_image_owner_user_fk
    FOREIGN KEY (owner_id) REFERENCES public.user(id) ON DELETE CASCADE,
  ADD CONSTRAINT gesture_image_org_fk
    FOREIGN KEY (org_id) REFERENCES public.organization(id) ON DELETE CASCADE;

-- ------------------------------------------------------------
-- 3. Drop existing foreign key constraints on cropped_image
-- ------------------------------------------------------------

ALTER TABLE public.cropped_image
  DROP CONSTRAINT IF EXISTS cropped_image_owner_auth_fk,
  DROP CONSTRAINT IF EXISTS cropped_image_owner_user_fk,
  DROP CONSTRAINT IF EXISTS cropped_image_org_fk;

-- ------------------------------------------------------------
-- 4. Recreate cropped_image foreign keys with ON DELETE CASCADE
-- ------------------------------------------------------------

ALTER TABLE public.cropped_image
  ADD CONSTRAINT cropped_image_owner_auth_fk
    FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD CONSTRAINT cropped_image_owner_user_fk
    FOREIGN KEY (owner_id) REFERENCES public.user(id) ON DELETE CASCADE,
  ADD CONSTRAINT cropped_image_org_fk
    FOREIGN KEY (org_id) REFERENCES public.organization(id) ON DELETE CASCADE;

-- ------------------------------------------------------------
-- EXPLANATION:
-- ------------------------------------------------------------
-- With these changes, the cascade deletion chain works properly:
--
-- 1. Delete auth.users → cascades to public.user (via existing CASCADE in 001)
-- 2. Delete public.user → cascades to gesture_image.owner_id (new CASCADE)
-- 3. Delete public.user → cascades to cropped_image.owner_id (new CASCADE)
--
-- Similarly for organizations:
-- 1. Delete organization → cascades to gesture_image.org_id (new CASCADE)
-- 2. Delete organization → cascades to cropped_image.org_id (new CASCADE)
--
-- This matches the behavior of the original `image` table from migration 001:
--   REFERENCES auth.users(id) ON DELETE CASCADE (line 48)
--   REFERENCES organization(id) ON DELETE CASCADE (line 49)

COMMIT;
