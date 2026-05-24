ALTER TABLE memo_assignments
ADD COLUMN IF NOT EXISTS assigned_validator_user_id UUID REFERENCES users(id);

