ALTER TABLE "user"
ADD COLUMN IF NOT EXISTS accessory text
  CHECK (accessory IN ('sunglasses', 'hat', 'balloon'));
