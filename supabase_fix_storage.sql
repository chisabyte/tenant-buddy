-- Supabase Storage Security Fix
-- Run this in Supabase Dashboard > SQL Editor

-- Step 1: Delete UPDATE policy for evidence files
DROP POLICY IF EXISTS "Users can update own evidence files" ON storage.objects;

-- Step 2: Delete UPDATE policy for receipts (optional but recommended)
DROP POLICY IF EXISTS "Users can update own receipt files" ON storage.objects;

-- Step 3: Ensure evidence bucket is private
UPDATE storage.buckets
SET public = false
WHERE id = 'evidence';

-- Step 4: Ensure receipts bucket is private
UPDATE storage.buckets
SET public = false
WHERE id = 'receipts';

-- Verification queries (run these after the above):
-- Check policies:
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%update%';

-- Check bucket privacy:
-- SELECT id, name, public FROM storage.buckets WHERE id IN ('evidence', 'receipts');

