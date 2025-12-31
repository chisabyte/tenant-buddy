-- Migration: Security Hardening for Multi-Tenant Isolation
-- Goals:
-- 1. Fix UPDATE RLS policies with WITH CHECK clause
-- 2. Lock evidence integrity fields via trigger
-- 3. Enforce cross-table consistency for evidence_items and comms_logs
-- 4. Prevent severity downgrade via trigger
-- 5. Harden storage security

-- ===========================================
-- 1. FIX UPDATE RLS POLICIES WITH WITH CHECK
-- ===========================================
-- UPDATE policies need WITH CHECK to prevent ownership transfer attacks

-- profiles (uses 'id' not 'user_id')
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- properties
DROP POLICY IF EXISTS "Users can update own properties" ON properties;
CREATE POLICY "Users can update own properties"
ON properties FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- issues
DROP POLICY IF EXISTS "Users can update own issues" ON issues;
CREATE POLICY "Users can update own issues"
ON issues FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- evidence_items
DROP POLICY IF EXISTS "Users can update own evidence items" ON evidence_items;
CREATE POLICY "Users can update own evidence items"
ON evidence_items FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- comms_logs
DROP POLICY IF EXISTS "Users can update own comms logs" ON comms_logs;
CREATE POLICY "Users can update own comms logs"
ON comms_logs FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ===========================================
-- 2. LOCK EVIDENCE INTEGRITY FIELDS
-- ===========================================
-- Evidence must be legally defensible. These fields cannot be modified after insert:
-- sha256, file_path, uploaded_at, occurred_at, user_id, property_id, issue_id

CREATE OR REPLACE FUNCTION prevent_evidence_integrity_mutation()
RETURNS TRIGGER AS $$
BEGIN
  -- Protect cryptographic hash
  IF NEW.sha256 IS DISTINCT FROM OLD.sha256 THEN
    RAISE EXCEPTION 'Cannot modify sha256 after insert - evidence integrity violation';
  END IF;

  -- Protect file path
  IF NEW.file_path IS DISTINCT FROM OLD.file_path THEN
    RAISE EXCEPTION 'Cannot modify file_path after insert - evidence integrity violation';
  END IF;

  -- Protect upload timestamp
  IF NEW.uploaded_at IS DISTINCT FROM OLD.uploaded_at THEN
    RAISE EXCEPTION 'Cannot modify uploaded_at after insert - evidence integrity violation';
  END IF;

  -- Protect occurrence timestamp
  IF NEW.occurred_at IS DISTINCT FROM OLD.occurred_at THEN
    RAISE EXCEPTION 'Cannot modify occurred_at after insert - evidence integrity violation';
  END IF;

  -- Protect ownership
  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Cannot modify user_id after insert - ownership violation';
  END IF;

  -- Protect property link
  IF NEW.property_id IS DISTINCT FROM OLD.property_id THEN
    RAISE EXCEPTION 'Cannot modify property_id after insert - evidence integrity violation';
  END IF;

  -- Protect issue link
  IF NEW.issue_id IS DISTINCT FROM OLD.issue_id THEN
    RAISE EXCEPTION 'Cannot modify issue_id after insert - evidence integrity violation';
  END IF;

  -- Safe fields can still be updated: note, category, room, type
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_evidence_integrity_mutation ON evidence_items;

CREATE TRIGGER trg_prevent_evidence_integrity_mutation
BEFORE UPDATE ON evidence_items
FOR EACH ROW
EXECUTE FUNCTION prevent_evidence_integrity_mutation();

COMMENT ON FUNCTION prevent_evidence_integrity_mutation() IS
'Prevents modification of integrity-critical fields on evidence_items after insert.
Safe fields (note, category, room, type) can still be updated.';

-- ===========================================
-- 3. ENFORCE CROSS-TABLE CONSISTENCY
-- ===========================================
-- Evidence and comms must reference issues owned by the same user and property

-- 3a. Evidence items consistency
CREATE OR REPLACE FUNCTION enforce_evidence_issue_consistency()
RETURNS TRIGGER AS $$
DECLARE
  issue_user UUID;
  issue_property UUID;
BEGIN
  -- Skip check if no issue linked
  IF NEW.issue_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Fetch the issue's user and property
  SELECT user_id, property_id
  INTO issue_user, issue_property
  FROM issues
  WHERE id = NEW.issue_id;

  -- Issue must exist
  IF issue_user IS NULL THEN
    RAISE EXCEPTION 'Invalid issue_id: issue does not exist';
  END IF;

  -- User must match
  IF issue_user <> NEW.user_id THEN
    RAISE EXCEPTION 'Cross-tenant violation: issue.user_id does not match evidence.user_id';
  END IF;

  -- Property must match
  IF issue_property <> NEW.property_id THEN
    RAISE EXCEPTION 'Inconsistent data: issue.property_id does not match evidence.property_id';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_evidence_issue_consistency ON evidence_items;

CREATE TRIGGER trg_enforce_evidence_issue_consistency
BEFORE INSERT OR UPDATE ON evidence_items
FOR EACH ROW
EXECUTE FUNCTION enforce_evidence_issue_consistency();

-- 3b. Comms logs consistency
CREATE OR REPLACE FUNCTION enforce_comms_issue_consistency()
RETURNS TRIGGER AS $$
DECLARE
  issue_user UUID;
  issue_property UUID;
BEGIN
  -- Skip check if no issue linked
  IF NEW.issue_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Fetch the issue's user and property
  SELECT user_id, property_id
  INTO issue_user, issue_property
  FROM issues
  WHERE id = NEW.issue_id;

  -- Issue must exist
  IF issue_user IS NULL THEN
    RAISE EXCEPTION 'Invalid issue_id: issue does not exist';
  END IF;

  -- User must match
  IF issue_user <> NEW.user_id THEN
    RAISE EXCEPTION 'Cross-tenant violation: issue.user_id does not match comms.user_id';
  END IF;

  -- Property must match
  IF issue_property <> NEW.property_id THEN
    RAISE EXCEPTION 'Inconsistent data: issue.property_id does not match comms.property_id';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_comms_issue_consistency ON comms_logs;

CREATE TRIGGER trg_enforce_comms_issue_consistency
BEFORE INSERT OR UPDATE ON comms_logs
FOR EACH ROW
EXECUTE FUNCTION enforce_comms_issue_consistency();

-- ===========================================
-- 4. PREVENT SEVERITY DOWNGRADE
-- ===========================================
-- Severity ranks: Low < Medium < High < Urgent
-- Severity can only increase, never decrease

CREATE OR REPLACE FUNCTION prevent_severity_downgrade()
RETURNS TRIGGER AS $$
DECLARE
  old_rank INT;
  new_rank INT;
BEGIN
  -- Only check if severity is changing
  IF NEW.severity = OLD.severity THEN
    RETURN NEW;
  END IF;

  -- Assign numeric ranks: Low=1, Medium=2, High=3, Urgent=4
  old_rank := CASE OLD.severity
    WHEN 'Low' THEN 1
    WHEN 'Medium' THEN 2
    WHEN 'High' THEN 3
    WHEN 'Urgent' THEN 4
    ELSE 1 -- Default for NULL or unknown
  END;

  new_rank := CASE NEW.severity
    WHEN 'Low' THEN 1
    WHEN 'Medium' THEN 2
    WHEN 'High' THEN 3
    WHEN 'Urgent' THEN 4
    ELSE 1 -- Default for NULL or unknown
  END;

  -- Block downgrade attempts
  IF new_rank < old_rank THEN
    RAISE EXCEPTION 'Severity cannot be downgraded from % to % - legal defensibility violation',
      OLD.severity, NEW.severity;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_severity_downgrade ON issues;

CREATE TRIGGER trg_prevent_severity_downgrade
BEFORE UPDATE ON issues
FOR EACH ROW
EXECUTE FUNCTION prevent_severity_downgrade();

COMMENT ON FUNCTION prevent_severity_downgrade() IS
'Enforces that issue severity can only escalate (Low -> Medium -> High -> Urgent), never downgrade.
This ensures legal defensibility of severity classifications.';

-- ===========================================
-- 5. HARDEN STORAGE SECURITY
-- ===========================================
-- Enable RLS on storage.objects (required for policies to work)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop the UPDATE policy on evidence bucket to prevent silent file replacement
-- This ensures evidence files cannot be overwritten once uploaded
DROP POLICY IF EXISTS "Users can update own evidence files" ON storage.objects;

-- Recreate UPDATE policy ONLY for receipts bucket (expenses can be corrected)
-- Evidence bucket intentionally has NO UPDATE policy

-- Note: Bucket privacy settings must be configured in Supabase Dashboard:
-- 1. Go to Storage > evidence bucket > Settings
-- 2. Ensure "Public" is OFF (bucket is private)
-- 3. Repeat for "receipts" bucket

-- ===========================================
-- 6. ADD AUDIT COMMENTS
-- ===========================================
COMMENT ON TABLE evidence_items IS
'Evidence records with integrity protection. After insert, sha256/file_path/timestamps/ownership cannot be modified.';

COMMENT ON TABLE comms_logs IS
'Communication logs with cross-table consistency enforcement. issue_id must reference an issue with matching user_id and property_id.';

COMMENT ON TABLE issues IS
'Tenant issues with severity protection. Severity can only escalate, never downgrade.';

-- ===========================================
-- VERIFICATION QUERIES (run manually to verify)
-- ===========================================
-- Check RLS is enabled:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

-- Check policies have WITH CHECK:
-- SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE tablename IN ('properties', 'issues', 'evidence_items', 'comms_logs');

-- Check triggers are active:
-- SELECT tgname, tgrelid::regclass, tgenabled FROM pg_trigger WHERE tgname LIKE 'trg_%';
