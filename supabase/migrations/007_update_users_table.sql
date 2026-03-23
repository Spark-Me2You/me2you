-- Migration: Update users table profile fields
-- Changes:
--   - Add pronouns, major, interests columns
--   - Rename bio -> status
--   - Drop username column
--   - Rename display_name -> name

ALTER TABLE "user"
  ADD COLUMN IF NOT EXISTS pronouns text,
  ADD COLUMN IF NOT EXISTS major    text,
  ADD COLUMN IF NOT EXISTS interests text[];

ALTER TABLE "user"
  RENAME COLUMN bio TO status;

ALTER TABLE "user"
  RENAME COLUMN display_name TO name;

ALTER TABLE "user"
  DROP COLUMN IF EXISTS username;