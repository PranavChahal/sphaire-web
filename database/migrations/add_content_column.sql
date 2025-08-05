-- Migration to add content column to design_files table
ALTER TABLE IF EXISTS design_files 
ADD COLUMN IF NOT EXISTS content JSONB;

-- Add comment to the column
COMMENT ON COLUMN design_files.content IS 'JSON content of the design';

-- Update existing rows if needed (optional)
-- UPDATE design_files SET content = '{}' WHERE content IS NULL;
