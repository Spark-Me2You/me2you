-- ============================================
-- FIX: Remove infinite recursion in admin RLS policy
-- ============================================

-- The "Admins can view other admins in same org" policy causes infinite recursion
-- because it queries the admin table from within the admin table's RLS policy.
--
-- When checking: SELECT * FROM admin WHERE id = auth.uid()
-- The policy tries to run: SELECT org_id FROM admin WHERE id = auth.uid()
-- Which triggers the policy again... infinite loop!

-- Drop the problematic policy
DROP POLICY IF EXISTS "Admins can view other admins in same org" ON admin;

-- Keep only the simple policy that doesn't cause recursion
-- This is sufficient for admin login and viewing own record
-- (The "Admins can view own record" policy already exists and works fine)

-- If we need admins to view other admins, we'll add a non-recursive policy:
-- Option 1: Use a security definer function
-- Option 2: Store org_id in JWT claims
-- Option 3: Query user table instead of admin table
-- For now, we keep it simple - admins can only view their own admin record
