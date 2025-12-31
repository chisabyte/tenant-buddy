-- Migration: 007_enforcement_override_logs
-- Description: Creates the override_logs table for tracking enforcement overrides
-- This table provides an audit trail when users proceed with actions despite
-- Case Health warnings or soft-blocks.

-- Create the override_logs table
CREATE TABLE IF NOT EXISTS override_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- What action was overridden
    action TEXT NOT NULL CHECK (action IN (
        'generate_pack',
        'close_issue',
        'resolve_issue',
        'delete_evidence',
        'delete_comms',
        'archive_issue'
    )),

    -- What level of enforcement was overridden
    enforcement_level TEXT NOT NULL CHECK (enforcement_level IN (
        'warned',
        'soft-blocked'
    )),

    -- Case Health at time of override
    health_status TEXT NOT NULL CHECK (health_status IN (
        'strong',
        'adequate',
        'weak',
        'at-risk'
    )),
    health_score INTEGER NOT NULL CHECK (health_score >= 0 AND health_score <= 100),

    -- Related entities (at least one should be set depending on action)
    issue_id UUID REFERENCES issues(id) ON DELETE SET NULL,
    evidence_id UUID REFERENCES evidence_items(id) ON DELETE SET NULL,
    comms_id UUID REFERENCES comms_logs(id) ON DELETE SET NULL,
    pack_id UUID REFERENCES evidence_pack_runs(id) ON DELETE SET NULL,

    -- Optional user-provided reason for override
    reason TEXT,

    -- Plan context at time of override
    plan_id TEXT NOT NULL CHECK (plan_id IN ('free', 'plus', 'pro')),
    plan_mode TEXT NOT NULL CHECK (plan_mode IN ('guided', 'advisor')),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for common queries
CREATE INDEX idx_override_logs_user_id ON override_logs(user_id);
CREATE INDEX idx_override_logs_created_at ON override_logs(created_at DESC);
CREATE INDEX idx_override_logs_action ON override_logs(action);
CREATE INDEX idx_override_logs_issue_id ON override_logs(issue_id);

-- Enable RLS
ALTER TABLE override_logs ENABLE ROW LEVEL SECURITY;

-- Users can only see their own override logs
CREATE POLICY "Users can view own override logs"
    ON override_logs
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Users can insert their own override logs
CREATE POLICY "Users can insert own override logs"
    ON override_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Override logs are immutable - no updates allowed
-- No UPDATE policy

-- Users can delete their own override logs (for GDPR compliance)
CREATE POLICY "Users can delete own override logs"
    ON override_logs
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Add comment for documentation
COMMENT ON TABLE override_logs IS 'Audit trail for Case Health enforcement overrides. Records when users proceed with actions despite warnings or soft-blocks.';
COMMENT ON COLUMN override_logs.action IS 'The action that was overridden';
COMMENT ON COLUMN override_logs.enforcement_level IS 'The enforcement level that was bypassed (warned or soft-blocked)';
COMMENT ON COLUMN override_logs.health_status IS 'Case Health status at time of override';
COMMENT ON COLUMN override_logs.health_score IS 'Case Health score (0-100) at time of override';
COMMENT ON COLUMN override_logs.reason IS 'Optional user-provided reason for proceeding';
COMMENT ON COLUMN override_logs.plan_mode IS 'Whether user was in guided or advisor mode';
