-- ============================================
-- FIX: Remove infinite recursion in user and organization RLS policies
-- ============================================

-- PROBLEM:
-- When querying the organization table, the "Users can view their organization" policy
-- queries the user table, which triggers RLS policies that query the user table again,
-- creating infinite recursion.

-- SOLUTION:
-- Use a SECURITY DEFINER function to get the user's org_id, bypassing RLS.
-- This breaks the recursion because the function doesn't trigger RLS policies.

-- Step 1: Create a security definer function to get user's org_id
CREATE OR REPLACE FUNCTION public.get_user_org_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER -- This bypasses RLS
STABLE
SET search_path = public
AS $$
    SELECT org_id FROM "user" WHERE id = auth.uid() LIMIT 1;
$$;

-- Step 2: Drop the old recursive policies and recreate them using the function

-- Drop old "Users can view their organization" policy
DROP POLICY IF EXISTS "Users can view their organization" ON organization;

-- Recreate it using the security definer function (no recursion!)
CREATE POLICY "Users can view their organization"
ON organization FOR SELECT
TO authenticated
USING (
    id = public.get_user_org_id()
);

-- Step 3: Fix the user table policies that cause recursion

-- Drop recursive policy
DROP POLICY IF EXISTS "Users can view public profiles in same org" ON "user";

-- Recreate using the security definer function
CREATE POLICY "Users can view public profiles in same org"
ON "user" FOR SELECT
TO authenticated
USING (
    visibility = 'public'
    AND org_id = public.get_user_org_id()
);

-- Step 4: Fix other policies that had recursion issues

-- Drop recursive policy on image table
DROP POLICY IF EXISTS "Users can view public images in same org" ON image;

-- Recreate using the security definer function
CREATE POLICY "Users can view public images in same org"
ON image FOR SELECT
TO authenticated
USING (
    is_public = true
    AND org_id = public.get_user_org_id()
);

-- Drop recursive policy for image creation
DROP POLICY IF EXISTS "Users can create own images" ON image;

-- Recreate using the security definer function
CREATE POLICY "Users can create own images"
ON image FOR INSERT
TO authenticated
WITH CHECK (
    owner_id = auth.uid()
    AND org_id = public.get_user_org_id()
);

-- EXPLANATION:
-- The public.get_user_org_id() function is marked SECURITY DEFINER,
-- which means it runs with the privileges of the function owner (superuser),
-- bypassing RLS entirely. This breaks the recursion cycle while still
-- maintaining the same access control logic.
-- We also set search_path to 'public' for security (prevents search_path attacks).
