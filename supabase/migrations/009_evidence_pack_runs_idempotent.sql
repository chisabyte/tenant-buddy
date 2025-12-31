-- Idempotent Evidence Pack runs (one row per pack)
-- Adds deterministic pack_key + issue_ids and converts evidence_pack_runs from per-issue rows to per-pack rows.
--
-- Uniqueness definition:
--   user_id + property_id + pack_key
-- Where pack_key is sha256(property_id:mode:from_date:to_date:sortedIssueIdsCsv)
--
-- NOTE: This is intentionally targeted: no unrelated schema refactors.

BEGIN;

-- Needed for sha256/digest()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Add new columns (nullable first for safe backfill)
ALTER TABLE evidence_pack_runs
  ADD COLUMN IF NOT EXISTS property_id UUID,
  ADD COLUMN IF NOT EXISTS mode TEXT,
  ADD COLUMN IF NOT EXISTS issue_ids UUID[],
  ADD COLUMN IF NOT EXISTS pack_key TEXT,
  ADD COLUMN IF NOT EXISTS generated_at TIMESTAMPTZ;

-- Allow pack-level rows (we will set issue_id NULL after collapsing)
ALTER TABLE evidence_pack_runs
  ALTER COLUMN issue_id DROP NOT NULL;

-- 2) Backfill property_id from issues for existing rows
UPDATE evidence_pack_runs e
SET property_id = i.property_id
FROM issues i
WHERE e.issue_id = i.id
  AND e.property_id IS NULL;

-- 3) Infer mode from pdf_path for existing rows (best effort)
UPDATE evidence_pack_runs
SET mode = CASE
  WHEN pdf_path ILIKE '%_Concise_%' THEN 'concise'
  WHEN pdf_path ILIKE '%_Detailed_%' THEN 'detailed'
  ELSE 'concise'
END
WHERE mode IS NULL;

-- 4) Default generated_at to created_at for existing rows
UPDATE evidence_pack_runs
SET generated_at = created_at
WHERE generated_at IS NULL;

-- 5) Collapse legacy per-issue rows into one row per pack run (grouped by pdf_path + date range + user)
-- Each legacy run inserted N rows with the same pdf_path (one per issue).
WITH grouped AS (
  SELECT
    user_id,
    pdf_path,
    from_date,
    to_date,
    -- All issues included in that generated PDF
    array_agg(DISTINCT issue_id ORDER BY issue_id) AS issue_ids,
    -- All issues in a pack should share the same property; use array_agg + subscript (MIN doesn't work on UUID)
    (array_agg(property_id ORDER BY created_at DESC))[1] AS property_id,
    (array_agg(mode ORDER BY created_at DESC))[1] AS mode,
    MAX(created_at) AS generated_at
  FROM evidence_pack_runs
  WHERE pdf_path IS NOT NULL
  GROUP BY user_id, pdf_path, from_date, to_date
),
keepers AS (
  -- Pick a single keeper row per legacy run (latest created_at)
  SELECT DISTINCT ON (e.user_id, e.pdf_path, e.from_date, e.to_date)
    e.id,
    e.user_id,
    e.pdf_path,
    e.from_date,
    e.to_date
  FROM evidence_pack_runs e
  WHERE e.pdf_path IS NOT NULL
  ORDER BY e.user_id, e.pdf_path, e.from_date, e.to_date, e.created_at DESC
)
UPDATE evidence_pack_runs e
SET
  issue_id = NULL,
  issue_ids = g.issue_ids,
  property_id = g.property_id,
  mode = g.mode,
  generated_at = g.generated_at,
  pack_key = encode(
    digest(
      g.property_id::text || ':' ||
      g.mode || ':' ||
      g.from_date::text || ':' ||
      g.to_date::text || ':' ||
      array_to_string(g.issue_ids::text[], ','),
      'sha256'
    ),
    'hex'
  )
FROM grouped g
JOIN keepers k
  ON k.user_id = g.user_id
 AND k.pdf_path = g.pdf_path
 AND k.from_date = g.from_date
 AND k.to_date = g.to_date
WHERE e.id = k.id;

-- Delete non-keeper legacy rows (we now have one row per pdf_path run)
WITH keepers AS (
  SELECT DISTINCT ON (e.user_id, e.pdf_path, e.from_date, e.to_date)
    e.id,
    e.user_id,
    e.pdf_path,
    e.from_date,
    e.to_date
  FROM evidence_pack_runs e
  WHERE e.pdf_path IS NOT NULL
  ORDER BY e.user_id, e.pdf_path, e.from_date, e.to_date, e.created_at DESC
)
DELETE FROM evidence_pack_runs e
WHERE e.pdf_path IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM keepers k
    WHERE k.id = e.id
  );

-- 6) For any remaining rows without pdf_path (edge cases), make them valid pack-rows
-- (e.g., legacy rows where pdf_path failed to save)
UPDATE evidence_pack_runs e
SET
  issue_ids = COALESCE(issue_ids, CASE WHEN issue_id IS NOT NULL THEN ARRAY[issue_id]::uuid[] ELSE ARRAY[]::uuid[] END),
  generated_at = COALESCE(generated_at, created_at),
  pack_key = COALESCE(
    pack_key,
    encode(
      digest(
        COALESCE(property_id::text, 'unknown') || ':' ||
        COALESCE(mode, 'concise') || ':' ||
        from_date::text || ':' ||
        to_date::text || ':' ||
        array_to_string(COALESCE(issue_ids, ARRAY[]::uuid[])::text[], ','),
        'sha256'
      ),
      'hex'
    )
  )
WHERE issue_ids IS NULL OR pack_key IS NULL OR generated_at IS NULL;

-- 6b) Drop any orphan pack rows that cannot be associated to a property (should be extremely rare)
-- We must enforce property_id NOT NULL for idempotency.
DELETE FROM evidence_pack_runs
WHERE property_id IS NULL;

-- 6c) If the user previously generated the same logical pack multiple times (different pdf_path),
-- we now deduplicate by (user_id, property_id, pack_key), keeping the most recent generated_at.
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, property_id, pack_key
      ORDER BY generated_at DESC, created_at DESC
    ) AS rn
  FROM evidence_pack_runs
)
DELETE FROM evidence_pack_runs
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- 7) Enforce NOT NULL + uniqueness (idempotency key)
ALTER TABLE evidence_pack_runs
  ALTER COLUMN property_id SET NOT NULL,
  ALTER COLUMN mode SET NOT NULL,
  ALTER COLUMN issue_ids SET NOT NULL,
  ALTER COLUMN pack_key SET NOT NULL,
  ALTER COLUMN generated_at SET NOT NULL;

-- Unique constraint: one pack per (user, property, pack_key)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'evidence_pack_runs_user_property_pack_key_unique'
  ) THEN
    ALTER TABLE evidence_pack_runs
      ADD CONSTRAINT evidence_pack_runs_user_property_pack_key_unique
      UNIQUE (user_id, property_id, pack_key);
  END IF;
END $$;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_evidence_pack_runs_user_generated_at
  ON evidence_pack_runs(user_id, generated_at DESC);

CREATE INDEX IF NOT EXISTS idx_evidence_pack_runs_property_id
  ON evidence_pack_runs(property_id);

CREATE INDEX IF NOT EXISTS idx_evidence_pack_runs_issue_ids_gin
  ON evidence_pack_runs USING GIN (issue_ids);

-- 8) RLS: add UPDATE policy to allow UPSERT updates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'evidence_pack_runs'
      AND policyname = 'Users can update own evidence pack runs'
  ) THEN
    CREATE POLICY "Users can update own evidence pack runs"
      ON evidence_pack_runs FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;
END $$;

COMMIT;


