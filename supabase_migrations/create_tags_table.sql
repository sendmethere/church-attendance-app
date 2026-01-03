-- Create tags table
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  abbreviation TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default tags
INSERT INTO tags (name, abbreviation) VALUES 
  ('중창A', 'A'),
  ('중창B', 'B'),
  ('중창C', 'C'),
  ('엘벧엘', '엘')
ON CONFLICT (name) DO NOTHING;

-- Enable RLS
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to read tags
CREATE POLICY "Allow authenticated users to read tags"
  ON tags
  FOR SELECT
  TO authenticated
  USING (true);

-- Create policy for authenticated users to insert tags
CREATE POLICY "Allow authenticated users to insert tags"
  ON tags
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create policy for authenticated users to update tags
CREATE POLICY "Allow authenticated users to update tags"
  ON tags
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create policy for authenticated users to delete tags
CREATE POLICY "Allow authenticated users to delete tags"
  ON tags
  FOR DELETE
  TO authenticated
  USING (true);

