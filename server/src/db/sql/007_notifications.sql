CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memo_id UUID REFERENCES memos(id) ON DELETE CASCADE,
  target_user_id UUID REFERENCES users(id),
  target_role VARCHAR(50),
  type VARCHAR(100) NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMP NULL,
  expires_at TIMESTAMP NULL,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_visibility
  ON notifications(target_user_id, target_role, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_dedupe
  ON notifications(type, memo_id, target_role, target_user_id, is_read);
