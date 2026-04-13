-- Migration: Add smart-crop fields to image table
-- Adds support for storing cropped image paths and tracking crop timestamp
--
-- Columns added:
--   - cropped_path: Storage path to the smart-cropped version (nullable, populated after crop)
--   - cropped_at: Timestamp when crop was generated (nullable)
--
-- Path convention: {org_id}/{user_id}/{uuid}_cropped.jpg
-- Original remains: {org_id}/{user_id}/{uuid}.jpg

ALTER TABLE image
ADD COLUMN IF NOT EXISTS cropped_path text,
ADD COLUMN IF NOT EXISTS cropped_at timestamptz;

-- Index for faster lookups of images pending crop
CREATE INDEX IF NOT EXISTS idx_image_cropped_null
ON image (id)
WHERE cropped_path IS NULL;
