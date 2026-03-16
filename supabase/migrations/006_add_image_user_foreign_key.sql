-- Add foreign key relationship between image.owner_id and user.id
-- This enables Supabase PostgREST to automatically join these tables
--
-- Context:
-- Both image.owner_id and user.id reference auth.users(id), so they share
-- the same values. Adding this explicit foreign key allows efficient joins
-- in the discovery service for fetching random images with user profile data.

-- Add foreign key constraint from image.owner_id to user.id
-- This constraint is validated immediately to ensure data integrity
ALTER TABLE image
ADD CONSTRAINT image_owner_id_user_fkey
FOREIGN KEY (owner_id)
REFERENCES "user"(id)
ON DELETE CASCADE;

-- Note: This constraint will fail if there are any orphaned images
-- (images with owner_id that don't exist in the user table)
-- If that happens, clean up orphaned records first:
--
-- DELETE FROM image
-- WHERE owner_id NOT IN (SELECT id FROM "user");
