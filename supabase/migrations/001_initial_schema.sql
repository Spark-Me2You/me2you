-- SETUP
-- Enable RLS on all tables
ALTER TABLE organization ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin ENABLE ROW LEVEL SECURITY;
ALTER TABLE image ENABLE ROW LEVEL SECURITY;

-- Indexes for performance
CREATE INDEX idx_user_org_id ON "user" (org_id);
CREATE INDEX idx_image_owner_id ON image (owner_id);
CREATE INDEX idx_image_org_id ON image (org_id);
CREATE INDEX idx_admin_org_id ON admin (org_id);

-- ORGANIZATION 
-- each organization has its own me2you (admins, users, images)
-- e.x. SPARK, BUILDS, …

-- SCHEMA
CREATE TABLE organization (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    date_created timestamptz DEFAULT now()
);

-- POLICIES
-- Users can view their own organization
CREATE POLICY "Users can view their organization"
ON organization FOR SELECT
TO authenticated
USING (
    id IN (
        SELECT org_id FROM "user" WHERE id = auth.uid()
    )
);

-- Admins can view their organization
CREATE POLICY "Admins can view their organization"
ON organization FOR SELECT
TO authenticated
USING (
    id IN (
        SELECT org_id FROM admin WHERE id = auth.uid()
    )
);

-- Admins can update their organization
CREATE POLICY "Admins can update their organization"
ON organization FOR UPDATE
TO authenticated
USING (
    id IN (
        SELECT org_id FROM admin WHERE id = auth.uid()
    )
)
WITH CHECK (
    id IN (
        SELECT org_id FROM admin WHERE id = auth.uid()
    )
);

-- USER
-- each user / student
-- links to auth.users for authentication
-- per organization
-- store the string that id card reader returns

-- SCHEMA
CREATE TABLE "user" (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    org_id uuid REFERENCES organization(id) ON DELETE SET NULL,
    username text NOT NULL,
    display_name text NOT NULL,
    bio text,
    visibility text DEFAULT 'public',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(id, org_id)
);

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
ON "user" FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Users can view public profiles in their org
CREATE POLICY "Users can view public profiles in same org"
ON "user" FOR SELECT
TO authenticated
USING (
    org_id IN (
        SELECT org_id FROM "user" WHERE id = auth.uid()
    )
    AND visibility = 'public'
);

-- Admins can view all users in their org
CREATE POLICY "Admins can view all users in their org"
ON "user" FOR SELECT
TO authenticated
USING (
    org_id IN (
        SELECT org_id FROM admin WHERE id = auth.uid()
    )
);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON "user" FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Admins can update users in their org
CREATE POLICY "Admins can update users in their org"
ON "user" FOR UPDATE
TO authenticated
USING (
    org_id IN (
        SELECT org_id FROM admin WHERE id = auth.uid()
    )
)
WITH CHECK (
    org_id IN (
        SELECT org_id FROM admin WHERE id = auth.uid()
    )
);

-- New users can insert themselves (signup)
CREATE POLICY "Users can create own profile"
ON "user" FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- Users can delete their own profile
CREATE POLICY "Users can delete own profile"
ON "user" FOR DELETE
TO authenticated
USING (id = auth.uid());

-- Admins can delete users in their org
CREATE POLICY "Admins can delete users in their org"
ON "user" FOR DELETE
TO authenticated
USING (
    org_id IN (
        SELECT org_id FROM admin WHERE id = auth.uid()
    )
);

-- ADMIN
-- administrative account to manage organizations
-- used to initialize me2you installation

-- SCHEMA
CREATE TABLE admin (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    org_id uuid REFERENCES organization(id) ON DELETE CASCADE,
    email text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- POLICIES
-- Admins can view themselves
CREATE POLICY "Admins can view own record"
ON admin FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Admins can view other admins in their org
CREATE POLICY "Admins can view other admins in same org"
ON admin FOR SELECT
TO authenticated
USING (
    org_id IN (
        SELECT org_id FROM admin WHERE id = auth.uid()
    )
);

-- Admins can update their own profile
CREATE POLICY "Admins can update own profile"
ON admin FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- IMAGE
-- store users and their image paths
-- store paths/metadata to bucket store

-- SCHEMA
CREATE TABLE image (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    storage_path text NOT NULL UNIQUE,
    category text NOT NULL DEFAULT 'uncategorized',
    is_public boolean DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- POLICIES
-- Users can view their own images
CREATE POLICY "Users can view own images"
ON image FOR SELECT
TO authenticated
USING (owner_id = auth.uid());

-- Users can view public images in their org
CREATE POLICY "Users can view public images in same org"
ON image FOR SELECT
TO authenticated
USING (
    org_id IN (
        SELECT org_id FROM "user" WHERE id = auth.uid()
    )
    AND is_public = true
);

-- Admins can view all images in their org
CREATE POLICY "Admins can view all images in their org"
ON image FOR SELECT
TO authenticated
USING (
    org_id IN (
        SELECT org_id FROM admin WHERE id = auth.uid()
    )
);

-- Users can insert their own images
CREATE POLICY "Users can create own images"
ON image FOR INSERT
TO authenticated
WITH CHECK (
    owner_id = auth.uid()
    AND org_id IN (
        SELECT org_id FROM "user" WHERE id = auth.uid()
    )
);

-- Users can update their own images
CREATE POLICY "Users can update own images"
ON image FOR UPDATE
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- Admins can update images in their org
CREATE POLICY "Admins can update images in their org"
ON image FOR UPDATE
TO authenticated
USING (
    org_id IN (
        SELECT org_id FROM admin WHERE id = auth.uid()
    )
)
WITH CHECK (
    org_id IN (
        SELECT org_id FROM admin WHERE id = auth.uid()
    )
);

-- Users can delete their own images
CREATE POLICY "Users can delete own images"
ON image FOR DELETE
TO authenticated
USING (owner_id = auth.uid());

-- Admins can delete images in their org
CREATE POLICY "Admins can delete images in their org"
ON image FOR DELETE
TO authenticated
USING (
    org_id IN (
        SELECT org_id FROM admin WHERE id = auth.uid()
    )
);
