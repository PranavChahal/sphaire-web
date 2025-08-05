-- Create design_files table
CREATE TABLE IF NOT EXISTS design_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  content JSONB,             -- JSON content of the design
  bucket_key TEXT,           -- path in Supabase Storage
  is_shared BOOLEAN DEFAULT FALSE,
  shared_with UUID[],        -- array of user IDs with whom it's shared
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_design_files_updated_at
    BEFORE UPDATE ON design_files
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE design_files ENABLE ROW LEVEL SECURITY;

-- Create policies for design_files table

-- Policy: Users can view their own files or files shared with them
CREATE POLICY "Users can view own files or shared files" ON design_files
    FOR SELECT USING (
        auth.uid() = owner_id OR 
        auth.uid() = ANY(shared_with)
    );

-- Policy: Users can insert their own files
CREATE POLICY "Users can insert own files" ON design_files
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Policy: Users can update their own files
CREATE POLICY "Users can update own files" ON design_files
    FOR UPDATE USING (auth.uid() = owner_id);

-- Policy: Users can delete their own files
CREATE POLICY "Users can delete own files" ON design_files
    FOR DELETE USING (auth.uid() = owner_id);

-- Create storage bucket for design assets (you'll need to create this in Supabase Storage UI)
-- This is just documentation - the actual bucket creation is done in the Supabase dashboard
/*
1. Go to Storage in your Supabase dashboard
2. Create a new bucket called "design-assets"
3. Set it to private (not public)
4. Create the following storage policies:

-- Storage policy for viewing files
CREATE POLICY "Users can view own design files" ON storage.objects
FOR SELECT USING (
  bucket_id = 'design-assets' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Storage policy for inserting files
CREATE POLICY "Users can upload own design files" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'design-assets' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Storage policy for updating files
CREATE POLICY "Users can update own design files" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'design-assets' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Storage policy for deleting files
CREATE POLICY "Users can delete own design files" ON storage.objects
FOR DELETE USING (
  bucket_id = 'design-assets' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);
*/
