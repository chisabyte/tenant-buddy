-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  state TEXT NOT NULL CHECK (state IN ('VIC', 'NSW', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create properties table
CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  address_text TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('VIC', 'NSW', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT')),
  lease_start_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create issues table
CREATE TABLE issues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create evidence_items table
CREATE TABLE evidence_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  issue_id UUID REFERENCES issues(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('photo', 'pdf', 'screenshot', 'document', 'other')),
  file_path TEXT,
  note TEXT,
  category TEXT CHECK (category IN ('Condition Report', 'Maintenance', 'Rent', 'Comms', 'Other')),
  room TEXT,
  occurred_at TIMESTAMPTZ NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sha256 TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create comms_logs table
CREATE TABLE comms_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  issue_id UUID REFERENCES issues(id) ON DELETE SET NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'phone', 'sms', 'in_person', 'letter', 'app', 'other')),
  summary TEXT NOT NULL,
  attachment_links TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create evidence_pack_runs table
CREATE TABLE evidence_pack_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  from_date DATE NOT NULL,
  to_date DATE NOT NULL,
  pdf_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_properties_user_id ON properties(user_id);
CREATE INDEX idx_issues_user_id ON issues(user_id);
CREATE INDEX idx_issues_property_id ON issues(property_id);
CREATE INDEX idx_evidence_items_user_id ON evidence_items(user_id);
CREATE INDEX idx_evidence_items_property_id ON evidence_items(property_id);
CREATE INDEX idx_evidence_items_issue_id ON evidence_items(issue_id);
CREATE INDEX idx_comms_logs_user_id ON comms_logs(user_id);
CREATE INDEX idx_comms_logs_property_id ON comms_logs(property_id);
CREATE INDEX idx_comms_logs_issue_id ON comms_logs(issue_id);
CREATE INDEX idx_evidence_pack_runs_user_id ON evidence_pack_runs(user_id);
CREATE INDEX idx_evidence_pack_runs_issue_id ON evidence_pack_runs(issue_id);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE comms_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_pack_runs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- RLS Policies for properties
CREATE POLICY "Users can view own properties"
  ON properties FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own properties"
  ON properties FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own properties"
  ON properties FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own properties"
  ON properties FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for issues
CREATE POLICY "Users can view own issues"
  ON issues FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own issues"
  ON issues FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own issues"
  ON issues FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own issues"
  ON issues FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for evidence_items
CREATE POLICY "Users can view own evidence items"
  ON evidence_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own evidence items"
  ON evidence_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own evidence items"
  ON evidence_items FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own evidence items"
  ON evidence_items FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for comms_logs
CREATE POLICY "Users can view own comms logs"
  ON comms_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own comms logs"
  ON comms_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comms logs"
  ON comms_logs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comms logs"
  ON comms_logs FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for evidence_pack_runs
CREATE POLICY "Users can view own evidence pack runs"
  ON evidence_pack_runs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own evidence pack runs"
  ON evidence_pack_runs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own evidence pack runs"
  ON evidence_pack_runs FOR DELETE
  USING (auth.uid() = user_id);

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, state)
  VALUES (NEW.id, 'VIC'); -- Default state, will be updated in onboarding
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON properties
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_issues_updated_at BEFORE UPDATE ON issues
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

