-- Gesture embeddings migration
-- TODO: Implement gesture embedding storage

-- Gestures table
-- TODO: Define gesture schema
CREATE TABLE IF NOT EXISTS gestures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  embedding VECTOR(512), -- TODO: Adjust dimensions as needed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(profile_id) -- One gesture per profile
);

-- Create index for similarity search
-- TODO: Implement vector similarity index
-- CREATE INDEX ON gestures USING ivfflat (embedding vector_cosine_ops);

-- TODO: Add functions for gesture matching
