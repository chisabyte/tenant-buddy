-- Add severity column to issues table
-- Severity is risk-based and NEVER downgrades automatically
-- Valid values: 'Urgent', 'High', 'Medium', 'Low'

ALTER TABLE issues
ADD COLUMN severity TEXT NOT NULL DEFAULT 'Low'
CHECK (severity IN ('Urgent', 'High', 'Medium', 'Low'));

-- Create index for filtering by severity
CREATE INDEX idx_issues_severity ON issues(severity);

-- Comment for documentation
COMMENT ON COLUMN issues.severity IS 'Risk-based severity level. NEVER downgrades automatically. Reflects impact/risk, not status.';
