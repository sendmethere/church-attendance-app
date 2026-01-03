-- Remove 중창A, 중창B, 중창C tags from all members
-- This removes the old tag values from members' tags arrays

UPDATE members
SET tags = (
  SELECT COALESCE(array_agg(tag), ARRAY[]::text[])
  FROM unnest(tags) AS tag
  WHERE tag NOT IN ('중창A', '중창B', '중창C')
)
WHERE tags && ARRAY['중창A', '중창B', '중창C'];

-- Verification query (optional - comment out if not needed)
-- SELECT id, name, tags FROM members WHERE tags IS NOT NULL AND array_length(tags, 1) > 0;

