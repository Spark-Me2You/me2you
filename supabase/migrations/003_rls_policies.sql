-- Row Level Security policies
-- TODO: Implement RLS for data protection

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE gestures ENABLE ROW LEVEL SECURITY;

-- Profiles policies
-- TODO: Define profile access policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (is_public = true);

CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Notes policies (private)
-- TODO: Define notes access policies
CREATE POLICY "Users can view their own notes"
  ON notes FOR SELECT
  USING (auth.uid() IN (
    SELECT user_id FROM profiles WHERE id = author_id
  ));

CREATE POLICY "Users can create notes"
  ON notes FOR INSERT
  WITH CHECK (auth.uid() IN (
    SELECT user_id FROM profiles WHERE id = author_id
  ));

-- TODO: Add more RLS policies
