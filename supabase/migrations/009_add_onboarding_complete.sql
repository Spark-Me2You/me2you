-- Add onboarding_complete column to user table
-- This tracks whether a user has completed the registration flow
-- Used for the "Automatic Rescue" flow to resume incomplete registrations

ALTER TABLE "user"
ADD COLUMN onboarding_complete BOOLEAN DEFAULT false;

-- Create an index for faster queries checking onboarding status
CREATE INDEX idx_user_onboarding_complete ON "user" (onboarding_complete)
WHERE onboarding_complete = false;

-- Update existing users to mark them as having completed onboarding
-- (They were created before this column existed, so they must be complete)
UPDATE "user"
SET onboarding_complete = true
WHERE onboarding_complete IS NULL OR onboarding_complete = false;