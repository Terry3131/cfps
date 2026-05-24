CREATE TABLE IF NOT EXISTS memo_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memo_id UUID NOT NULL REFERENCES memos(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES users(id),
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(100),
  file_size INTEGER,
  file_url TEXT NOT NULL,
  attachment_category VARCHAR(100),
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
