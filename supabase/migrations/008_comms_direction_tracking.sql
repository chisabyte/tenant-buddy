-- Add direction and response_status columns to comms_logs for Evidence Pack v2
-- Direction tracks whether communication is outbound (tenant→agent) or inbound (agent→tenant)
-- Response status tracks if a response is awaiting, received, or not applicable

-- Add direction column with default 'outbound' (most common case)
ALTER TABLE comms_logs 
ADD COLUMN IF NOT EXISTS direction TEXT 
CHECK (direction IN ('outbound', 'inbound')) 
DEFAULT 'outbound';

-- Add response_status column
ALTER TABLE comms_logs 
ADD COLUMN IF NOT EXISTS response_status TEXT 
CHECK (response_status IN ('awaiting', 'received', 'none'));

-- Create index for filtering by direction
CREATE INDEX IF NOT EXISTS idx_comms_logs_direction ON comms_logs(direction);

-- Create index for filtering by response status
CREATE INDEX IF NOT EXISTS idx_comms_logs_response_status ON comms_logs(response_status);

-- Update database types for TypeScript generation
COMMENT ON COLUMN comms_logs.direction IS 'Direction of communication: outbound (tenant to agent/landlord) or inbound (agent/landlord to tenant)';
COMMENT ON COLUMN comms_logs.response_status IS 'Status of response: awaiting (waiting for reply), received (got response), none (not applicable)';

