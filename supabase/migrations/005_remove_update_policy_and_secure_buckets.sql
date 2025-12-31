-- Migration: 005_remove_update_policy_and_secure_buckets
-- Description: Remove UPDATE policy from evidence files and ensure buckets are private
-- Date: 2025-01-XX

-- ===========================================
-- STEP 1: DELETE UPDATE POLICY FOR EVIDENCE
-- ===========================================
-- Remove the UPDATE policy to prevent users from modifying evidence files
-- Evidence files should be immutable for integrity/audit purposes

DROP POLICY IF EXISTS "Users can update own evidence files" ON storage.objects;

-- Also remove UPDATE policy for receipts (if you want receipts immutable too)
DROP POLICY IF EXISTS "Users can update own receipt files" ON storage.objects;

-- ===========================================
-- STEP 2: ENSURE BUCKETS ARE PRIVATE
-- ===========================================
-- Make sure evidence bucket is private (not public)
UPDATE storage.buckets
SET public = false
WHERE id = 'evidence';

-- Make sure receipts bucket is private (not public)
UPDATE storage.buckets
SET public = false
WHERE id = 'receipts';

-- ===========================================
-- VERIFICATION
-- ===========================================
-- Run these queries to verify:

-- Check policies (should NOT see UPDATE policies):
-- SELECT * FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%evidence%';

-- Check bucket privacy (both should be false):
-- SELECT id, name, public FROM storage.buckets WHERE id IN ('evidence', 'receipts');

