-- Migration: Add Row Level Security policies for Supabase Storage
-- This ensures users can only access their own uploaded files

-- Note: Run this in the Supabase SQL Editor or via Supabase CLI
-- The 'evidence' bucket should already exist; create it in Storage settings if not

-- Enable RLS on storage.objects (if not already enabled)
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- EVIDENCE BUCKET POLICIES
-- ===========================================

-- Policy: Users can view their own evidence files
-- Files are stored as: {user_id}/{timestamp}.{extension}
CREATE POLICY "Users can view own evidence files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'evidence'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can upload evidence files to their own folder
CREATE POLICY "Users can upload evidence to own folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'evidence'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can update their own evidence files
CREATE POLICY "Users can update own evidence files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'evidence'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'evidence'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can delete their own evidence files
CREATE POLICY "Users can delete own evidence files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'evidence'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ===========================================
-- RECEIPTS BUCKET POLICIES (for expense tracking)
-- ===========================================

-- Policy: Users can view their own receipt files
CREATE POLICY "Users can view own receipt files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'receipts'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can upload receipts to their own folder
CREATE POLICY "Users can upload receipts to own folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'receipts'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can update their own receipts
CREATE POLICY "Users can update own receipt files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'receipts'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'receipts'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can delete their own receipts
CREATE POLICY "Users can delete own receipt files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'receipts'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ===========================================
-- NOTES
-- ===========================================
--
-- These policies ensure:
-- 1. Files are organized by user ID: {user_id}/{filename}
-- 2. Users can only access files in their own folder
-- 3. RLS protects against unauthorized access even if someone guesses a file path
--
-- To apply these policies:
-- 1. Go to Supabase Dashboard > Storage > Policies
-- 2. Create the 'evidence' and 'receipts' buckets if they don't exist
-- 3. Run this SQL in the SQL Editor
--
-- Alternatively, you can configure policies in the Dashboard UI:
-- - For each bucket, add SELECT, INSERT, UPDATE, DELETE policies
-- - Use the expression: auth.uid()::text = (storage.foldername(name))[1]
