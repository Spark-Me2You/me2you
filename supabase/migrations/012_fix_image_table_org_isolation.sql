-- ============================================
-- FIX: Cross-org data exposure and org_id spoofing in gesture_image and cropped_image tables
-- ============================================

BEGIN;

-- ------------------------------------------------------------
-- 1. Drop insecure policies from migration 009
-- ------------------------------------------------------------

-- Drop public-read policies that allow cross-org access
DROP POLICY IF EXISTS gesture_image_public_read ON public.gesture_image;
DROP POLICY IF EXISTS cropped_image_public_read ON public.cropped_image;

-- Drop overly broad FOR ALL policies that don't validate org_id on INSERT/UPDATE
DROP POLICY IF EXISTS gesture_image_owner_all ON public.gesture_image;
DROP POLICY IF EXISTS cropped_image_owner_all ON public.cropped_image;

-- ------------------------------------------------------------
-- 2. Create secure policies for gesture_image table
-- ------------------------------------------------------------

-- INSERT: Enforce owner_id AND org_id validation
CREATE POLICY "Users can create gesture images in their org"
ON public.gesture_image FOR INSERT
TO authenticated
WITH CHECK (
    owner_id = auth.uid()
    AND org_id = public.get_user_org_id()
);

-- UPDATE: Enforce owner_id AND org_id validation
CREATE POLICY "Users can update their own gesture images"
ON public.gesture_image FOR UPDATE
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (
    owner_id = auth.uid()
    AND org_id = public.get_user_org_id()
);

-- SELECT: Users can view their own images
CREATE POLICY "Users can view their own gesture images"
ON public.gesture_image FOR SELECT
TO authenticated
USING (owner_id = auth.uid());

-- SELECT: Users can view public images ONLY from their organization
CREATE POLICY "Users can view public gesture images in same org"
ON public.gesture_image FOR SELECT
TO authenticated
USING (
    is_public = true
    AND org_id = public.get_user_org_id()
);

-- DELETE: Users can delete their own images
CREATE POLICY "Users can delete their own gesture images"
ON public.gesture_image FOR DELETE
TO authenticated
USING (owner_id = auth.uid());

-- SELECT: Admins can view all gesture images in their org
CREATE POLICY "Admins can view gesture images in their org"
ON public.gesture_image FOR SELECT
TO authenticated
USING (
    org_id IN (
        SELECT org_id FROM admin WHERE id = auth.uid()
    )
);

-- SELECT: Kiosks can view all gesture images in their org
CREATE POLICY "Kiosks can view gesture images in their org"
ON public.gesture_image FOR SELECT
TO authenticated
USING (
    (auth.jwt() -> 'app_metadata' ->> 'is_kiosk')::boolean = true
    AND org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid
);

-- ------------------------------------------------------------
-- 3. Create secure policies for cropped_image table
-- ------------------------------------------------------------

-- INSERT: Enforce owner_id AND org_id validation
CREATE POLICY "Users can create cropped images in their org"
ON public.cropped_image FOR INSERT
TO authenticated
WITH CHECK (
    owner_id = auth.uid()
    AND org_id = public.get_user_org_id()
);

-- UPDATE: Enforce owner_id AND org_id validation
CREATE POLICY "Users can update their own cropped images"
ON public.cropped_image FOR UPDATE
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (
    owner_id = auth.uid()
    AND org_id = public.get_user_org_id()
);

-- SELECT: Users can view their own images
CREATE POLICY "Users can view their own cropped images"
ON public.cropped_image FOR SELECT
TO authenticated
USING (owner_id = auth.uid());

-- SELECT: Users can view public images ONLY from their organization
CREATE POLICY "Users can view public cropped images in same org"
ON public.cropped_image FOR SELECT
TO authenticated
USING (
    is_public = true
    AND org_id = public.get_user_org_id()
);

-- DELETE: Users can delete their own images
CREATE POLICY "Users can delete their own cropped images"
ON public.cropped_image FOR DELETE
TO authenticated
USING (owner_id = auth.uid());

-- SELECT: Admins can view all cropped images in their org
CREATE POLICY "Admins can view cropped images in their org"
ON public.cropped_image FOR SELECT
TO authenticated
USING (
    org_id IN (
        SELECT org_id FROM admin WHERE id = auth.uid()
    )
);

-- SELECT: Kiosks can view all cropped images in their org
CREATE POLICY "Kiosks can view cropped images in their org"
ON public.cropped_image FOR SELECT
TO authenticated
USING (
    (auth.jwt() -> 'app_metadata' ->> 'is_kiosk')::boolean = true
    AND org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid
);

COMMIT;
