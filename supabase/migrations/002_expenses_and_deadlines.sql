-- Migration: Add Expense Tracking and Deadlines/Reminders
-- Competitive features to match TenantGuard AI

-- ============================================
-- Expense Tracking Table
-- ============================================
CREATE TABLE IF NOT EXISTS expense_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  issue_id UUID REFERENCES issues(id) ON DELETE SET NULL,

  -- Expense details
  amount DECIMAL(10, 2) NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'AUD',
  category TEXT NOT NULL CHECK (category IN (
    'Repairs', 'Cleaning', 'Temporary Accommodation',
    'Moving Costs', 'Storage', 'Legal Fees',
    'Lost Income', 'Replacement Items', 'Other'
  )),
  description TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,

  -- Receipt/proof
  receipt_file_path TEXT,
  receipt_sha256 TEXT,

  -- Status
  reimbursement_status TEXT NOT NULL DEFAULT 'pending' CHECK (reimbursement_status IN (
    'pending', 'claimed', 'approved', 'rejected', 'paid'
  )),

  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for expense_items
ALTER TABLE expense_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own expense items"
  ON expense_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own expense items"
  ON expense_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own expense items"
  ON expense_items FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own expense items"
  ON expense_items FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes for expense_items
CREATE INDEX idx_expense_items_user_id ON expense_items(user_id);
CREATE INDEX idx_expense_items_property_id ON expense_items(property_id);
CREATE INDEX idx_expense_items_issue_id ON expense_items(issue_id);
CREATE INDEX idx_expense_items_occurred_at ON expense_items(occurred_at);

-- ============================================
-- Deadlines/Reminders Table
-- ============================================
CREATE TABLE IF NOT EXISTS deadlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  issue_id UUID REFERENCES issues(id) ON DELETE SET NULL,

  -- Deadline details
  title TEXT NOT NULL,
  description TEXT,
  deadline_date DATE NOT NULL,
  deadline_time TIME,

  -- Category/type
  category TEXT NOT NULL CHECK (category IN (
    'Tribunal Hearing', 'Response Due', 'Inspection',
    'Rent Payment', 'Notice Period', 'Repair Deadline',
    'Evidence Submission', 'Mediation', 'Other'
  )),

  -- Priority
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),

  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled', 'overdue')),
  completed_at TIMESTAMPTZ,

  -- Reminders
  reminder_days_before INT[] DEFAULT ARRAY[7, 3, 1], -- Days before to send reminders
  reminders_sent TIMESTAMPTZ[], -- Track when reminders were sent

  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for deadlines
ALTER TABLE deadlines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own deadlines"
  ON deadlines FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own deadlines"
  ON deadlines FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own deadlines"
  ON deadlines FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own deadlines"
  ON deadlines FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes for deadlines
CREATE INDEX idx_deadlines_user_id ON deadlines(user_id);
CREATE INDEX idx_deadlines_property_id ON deadlines(property_id);
CREATE INDEX idx_deadlines_issue_id ON deadlines(issue_id);
CREATE INDEX idx_deadlines_deadline_date ON deadlines(deadline_date);
CREATE INDEX idx_deadlines_status ON deadlines(status);

-- ============================================
-- AI-Generated Letters Table
-- ============================================
CREATE TABLE IF NOT EXISTS generated_letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  issue_id UUID REFERENCES issues(id) ON DELETE SET NULL,

  -- Letter details
  letter_type TEXT NOT NULL CHECK (letter_type IN (
    'Repair Request', 'Rent Reduction Request', 'Lease Termination Notice',
    'Complaint Letter', 'Deposit Claim', 'Formal Notice', 'Other'
  )),
  recipient TEXT NOT NULL, -- Landlord, Agent, Tribunal, etc.
  subject TEXT NOT NULL,
  content TEXT NOT NULL,

  -- Generation details
  ai_model TEXT, -- e.g., 'claude-3-5-sonnet'
  generation_prompt TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'archived')),
  sent_at TIMESTAMPTZ,
  sent_via TEXT, -- email, post, in-person, etc.

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for generated_letters
ALTER TABLE generated_letters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own generated letters"
  ON generated_letters FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own generated letters"
  ON generated_letters FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own generated letters"
  ON generated_letters FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own generated letters"
  ON generated_letters FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes for generated_letters
CREATE INDEX idx_generated_letters_user_id ON generated_letters(user_id);
CREATE INDEX idx_generated_letters_property_id ON generated_letters(property_id);
CREATE INDEX idx_generated_letters_issue_id ON generated_letters(issue_id);
CREATE INDEX idx_generated_letters_status ON generated_letters(status);

-- ============================================
-- Case Analysis/Strength Tracking
-- ============================================
CREATE TABLE IF NOT EXISTS case_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,

  -- Analysis details
  strength_score INT CHECK (strength_score >= 0 AND strength_score <= 100),
  strengths TEXT[],
  weaknesses TEXT[],
  recommendations TEXT[],

  -- AI analysis
  ai_model TEXT,
  analysis_date TIMESTAMPTZ DEFAULT now(),

  -- Evidence metrics
  evidence_count INT DEFAULT 0,
  communication_count INT DEFAULT 0,
  expense_total DECIMAL(10, 2) DEFAULT 0,
  days_since_issue INT DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for case_analyses
ALTER TABLE case_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own case analyses"
  ON case_analyses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own case analyses"
  ON case_analyses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own case analyses"
  ON case_analyses FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own case analyses"
  ON case_analyses FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes for case_analyses
CREATE INDEX idx_case_analyses_user_id ON case_analyses(user_id);
CREATE INDEX idx_case_analyses_issue_id ON case_analyses(issue_id);

-- ============================================
-- Update timestamps trigger function
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update triggers
CREATE TRIGGER update_expense_items_updated_at
  BEFORE UPDATE ON expense_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deadlines_updated_at
  BEFORE UPDATE ON deadlines
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_generated_letters_updated_at
  BEFORE UPDATE ON generated_letters
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_case_analyses_updated_at
  BEFORE UPDATE ON case_analyses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
