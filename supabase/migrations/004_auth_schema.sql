-- 1. ORGANIZATIONS
-- Top-level entity for grouping users and data
CREATE TABLE organization (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 2. USERS (Public Profile)
-- Links to auth.users and belongs to an organization
CREATE TABLE "user" (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id uuid REFERENCES organization(id) ON DELETE SET NULL,
  name text,
  bio text,
  photo_url text, -- Can store the storage_path of the profile pic here
  visibility text DEFAULT 'public',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. ORG_ADMINS
-- Permission table to define who manages an organization
CREATE TABLE org_admin (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES organization(id) ON DELETE CASCADE,
  auth_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  role text DEFAULT 'admin',
  created_at timestamptz DEFAULT now()
);

-- 4. IMAGE (The Linker Table)
-- Stores metadata for files in Supabase Storage
CREATE TABLE image (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL
    REFERENCES auth.users(id) ON DELETE CASCADE
    DEFAULT auth.uid(),

  -- The 'UNIQUE' constraint prevents duplicate links to the same file
  storage_path text NOT NULL UNIQUE,

  category text NOT NULL DEFAULT 'uncategorized',
  is_public boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE organization ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_admin ENABLE ROW LEVEL SECURITY;
ALTER TABLE image ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organization
-- Org admins can view organizations they manage
CREATE POLICY "Org admins can view their organizations"
  ON organization FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM org_admin
      WHERE org_admin.org_id = organization.id
      AND org_admin.auth_user_id = auth.uid()
    )
  );

-- RLS Policies for user
-- Users can view their own profile
CREATE POLICY "Users can view their own profile"
  ON "user" FOR SELECT
  USING (auth.uid() = id);

-- Users can view other users in their organization
CREATE POLICY "Users can view org members"
  ON "user" FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM "user" WHERE id = auth.uid()
    )
  );

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
  ON "user" FOR UPDATE
  USING (auth.uid() = id);

-- RLS Policies for org_admin
-- Org admins can view their own admin records
CREATE POLICY "Org admins can view their records"
  ON org_admin FOR SELECT
  USING (auth.uid() = auth_user_id);

-- RLS Policies for image
-- Users can view their own images
CREATE POLICY "Users can view their own images"
  ON image FOR SELECT
  USING (auth.uid() = owner_id);

-- Users can insert their own images
CREATE POLICY "Users can insert their own images"
  ON image FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Users can delete their own images
CREATE POLICY "Users can delete their own images"
  ON image FOR DELETE
  USING (auth.uid() = owner_id);

-- Public images can be viewed by anyone
CREATE POLICY "Public images are viewable by all"
  ON image FOR SELECT
  USING (is_public = true);

-- Indexes for performance
CREATE INDEX idx_user_org_id ON "user"(org_id);
CREATE INDEX idx_org_admin_org_id ON org_admin(org_id);
CREATE INDEX idx_org_admin_user_id ON org_admin(auth_user_id);
CREATE INDEX idx_image_owner_id ON image(owner_id);
CREATE INDEX idx_image_category ON image(category);

-- Trigger for updated_at on user table
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_updated_at BEFORE UPDATE ON "user"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
