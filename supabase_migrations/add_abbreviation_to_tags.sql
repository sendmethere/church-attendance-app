-- Add abbreviation column to tags table
ALTER TABLE tags 
ADD COLUMN IF NOT EXISTS abbreviation TEXT;

-- Update existing tags with abbreviations
UPDATE tags SET abbreviation = 'A' WHERE name = '중창A';
UPDATE tags SET abbreviation = 'B' WHERE name = '중창B';
UPDATE tags SET abbreviation = 'C' WHERE name = '중창C';
UPDATE tags SET abbreviation = '엘' WHERE name = '엘벧엘';


