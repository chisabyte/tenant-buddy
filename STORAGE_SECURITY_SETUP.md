# Storage Security Setup Guide

## Overview
This guide helps you secure your Supabase Storage buckets by:
1. Removing UPDATE policies (evidence files should be immutable)
2. Ensuring buckets are private (not publicly accessible)

## Method 1: Using SQL Editor (Recommended)

### Step 1: Open Supabase SQL Editor
1. Go to your Supabase Dashboard: https://app.supabase.com
2. Navigate to: **SQL Editor** (left sidebar)
3. Click **New query**

### Step 2: Run the Security SQL

Copy and paste this SQL:

```sql
-- Delete UPDATE policy for evidence files
DROP POLICY IF EXISTS "Users can update own evidence files" ON storage.objects;

-- Delete UPDATE policy for receipts (optional - if you want receipts immutable)
DROP POLICY IF EXISTS "Users can update own receipt files" ON storage.objects;

-- Ensure evidence bucket is private
UPDATE storage.buckets
SET public = false
WHERE id = 'evidence';

-- Ensure receipts bucket is private
UPDATE storage.buckets
SET public = false
WHERE id = 'receipts';
```

### Step 3: Execute and Verify
1. Click **Run** (or press Ctrl+Enter)
2. Should see "Success. No rows returned" or similar

### Step 4: Verify Changes

Run these verification queries:

```sql
-- Check policies (should NOT show UPDATE policies):
SELECT schemaname, tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE tablename = 'objects' 
  AND (policyname LIKE '%evidence%' OR policyname LIKE '%receipt%');

-- Check bucket privacy (both should show public = false):
SELECT id, name, public, file_size_limit, allowed_mime_types 
FROM storage.buckets 
WHERE id IN ('evidence', 'receipts');
```

---

## Method 2: Using Dashboard UI

### Delete UPDATE Policy

1. Go to **Storage** → **Policies**
2. Find the policy: **"Users can update own evidence files"**
3. Click the **three dots** (⋯) next to the policy
4. Click **Delete**
5. Confirm deletion

**Optional:** Also delete **"Users can update own receipt files"** if you want receipts immutable.

### Ensure Buckets Are Private

#### For "evidence" bucket:
1. Go to **Storage** → **Buckets**
2. Click on the **"evidence"** bucket
3. Click **Settings** (gear icon or Settings tab)
4. Find **"Public bucket"** toggle
5. Ensure it's **OFF** (not checked/green)
6. Click **Save** if you changed anything

#### For "receipts" bucket:
1. Go to **Storage** → **Buckets**
2. Click on the **"receipts"** bucket
3. Click **Settings**
4. Find **"Public bucket"** toggle
5. Ensure it's **OFF** (not checked/green)
6. Click **Save** if you changed anything

---

## Why Remove UPDATE Policy?

**Security Best Practice:**
- **Evidence files should be immutable** - once uploaded, they shouldn't be modified
- This preserves **audit integrity** - files can't be tampered with
- **Legal/Compliance**: Evidence files are often required to be unmodified records
- **Data Integrity**: SHA256 hashes remain valid (no modification means no hash mismatch)

**If users need to "replace" a file:**
- Delete the old file (DELETE policy still works)
- Upload a new file (INSERT policy still works)
- This creates a clear audit trail

---

## Current Policy Summary

After completing this setup, you'll have:

### Evidence Bucket Policies:
- ✅ **SELECT** - Users can view their own files
- ✅ **INSERT** - Users can upload files
- ❌ **UPDATE** - REMOVED (immutability)
- ✅ **DELETE** - Users can delete their own files

### Receipts Bucket Policies:
- ✅ **SELECT** - Users can view their own files
- ✅ **INSERT** - Users can upload files
- ❌ **UPDATE** - REMOVED (optional, recommended)
- ✅ **DELETE** - Users can delete their own files

### Bucket Privacy:
- ✅ **evidence** - Private (public = false)
- ✅ **receipts** - Private (public = false)

---

## Verification Checklist

After completing the setup, verify:

- [ ] UPDATE policy for evidence is deleted
- [ ] UPDATE policy for receipts is deleted (if you chose to)
- [ ] "evidence" bucket shows "Public" = OFF/False
- [ ] "receipts" bucket shows "Public" = OFF/False
- [ ] Users can still upload files (INSERT works)
- [ ] Users can still view their own files (SELECT works)
- [ ] Users can still delete their own files (DELETE works)
- [ ] Users cannot modify uploaded files (UPDATE blocked)

---

## Troubleshooting

### "Policy does not exist" error
- This is OK - it means the policy was already deleted or never existed
- Continue with the rest of the SQL

### Bucket not found error
- Create the bucket first:
  1. Go to **Storage** → **Buckets**
  2. Click **New bucket**
  3. Name: `evidence` or `receipts`
  4. Set **Public** = OFF
  5. Click **Create bucket**

### Files still accessible without auth
- Verify bucket `public` column is `false`
- Check that RLS is enabled: `SELECT * FROM pg_tables WHERE tablename = 'objects';`
- Ensure SELECT policies are correctly configured

---

## Security Notes

✅ **Good Security:**
- Buckets are private
- Files are user-scoped (only owner can access)
- UPDATE disabled (files are immutable)
- Signed URLs used for access (time-limited)

❌ **What This Prevents:**
- Public file access without authentication
- Unauthorized file modification
- Evidence tampering
- Unauthenticated file downloads

