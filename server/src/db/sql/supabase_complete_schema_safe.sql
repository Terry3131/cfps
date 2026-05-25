-- CFPS Supabase safe schema initializer.
-- Use this for a partially initialized database that already has users.
-- It preserves existing users and creates/repairs the remaining CFPS tables.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
SET search_path TO public;

CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(150),
  username VARCHAR(100) NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'VIEWER',
  branch_dru VARCHAR(150),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS full_name VARCHAR(150);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS username VARCHAR(100);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'VIEWER';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS branch_dru VARCHAR(150);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

UPDATE public.users SET id = gen_random_uuid() WHERE id IS NULL;
UPDATE public.users SET full_name = username WHERE full_name IS NULL OR BTRIM(full_name) = '';
UPDATE public.users SET role = 'VIEWER' WHERE role IS NULL OR BTRIM(role) = '';
UPDATE public.users SET is_active = TRUE WHERE is_active IS NULL;
UPDATE public.users SET created_at = NOW() WHERE created_at IS NULL;
UPDATE public.users SET updated_at = NOW() WHERE updated_at IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'users_pkey' AND conrelid = 'public.users'::regclass
  ) THEN
    ALTER TABLE public.users ADD CONSTRAINT users_pkey PRIMARY KEY (id);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS users_username_unique_idx
ON public.users (username);

CREATE TABLE IF NOT EXISTS public.organizational_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  unit_type VARCHAR(50) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.memos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_no VARCHAR(120) NOT NULL,
  heading TEXT NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL,
  branch_dru VARCHAR(150) NOT NULL,
  beneficiary_name VARCHAR(200),
  amount NUMERIC(18,2) DEFAULT 0,
  currency VARCHAR(20) NOT NULL DEFAULT 'NGN',
  approval_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  lifecycle_stage VARCHAR(50) NOT NULL DEFAULT 'REGISTERED',
  progress_percent INTEGER NOT NULL DEFAULT 0,
  is_locked BOOLEAN NOT NULL DEFAULT FALSE,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  approved_by UUID,
  approved_at TIMESTAMP,
  created_by UUID NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  business_status VARCHAR(100) NOT NULL DEFAULT 'DRAFT',
  sync_status VARCHAR(30) DEFAULT 'SYNCED',
  last_modified_at TIMESTAMP NOT NULL DEFAULT NOW(),
  sync_id UUID DEFAULT gen_random_uuid(),
  version INTEGER NOT NULL DEFAULT 1,
  state VARCHAR(100),
  location TEXT,
  geopolitical_zone VARCHAR(100),
  movement_type VARCHAR(20)
);

ALTER TABLE public.memos ADD COLUMN IF NOT EXISTS business_status VARCHAR(100) NOT NULL DEFAULT 'DRAFT';
ALTER TABLE public.memos ADD COLUMN IF NOT EXISTS sync_status VARCHAR(30) DEFAULT 'SYNCED';
ALTER TABLE public.memos ADD COLUMN IF NOT EXISTS last_modified_at TIMESTAMP NOT NULL DEFAULT NOW();
ALTER TABLE public.memos ADD COLUMN IF NOT EXISTS sync_id UUID DEFAULT gen_random_uuid();
ALTER TABLE public.memos ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE public.memos ADD COLUMN IF NOT EXISTS state VARCHAR(100);
ALTER TABLE public.memos ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.memos ADD COLUMN IF NOT EXISTS geopolitical_zone VARCHAR(100);
ALTER TABLE public.memos ADD COLUMN IF NOT EXISTS movement_type VARCHAR(20);

CREATE TABLE IF NOT EXISTS public.memo_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memo_id UUID NOT NULL,
  primary_monitor_branch VARCHAR(150) NOT NULL,
  validator_branch VARCHAR(150) NOT NULL,
  assigned_to_user_id UUID,
  assigned_by UUID NOT NULL,
  assigned_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  assigned_validator_user_id UUID
);

ALTER TABLE public.memo_assignments
ADD COLUMN IF NOT EXISTS assigned_validator_user_id UUID;

CREATE TABLE IF NOT EXISTS public.memo_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memo_id UUID NOT NULL,
  uploaded_by UUID NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(100),
  file_size INTEGER,
  file_url TEXT NOT NULL,
  attachment_category VARCHAR(100),
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.memo_commencements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memo_id UUID NOT NULL,
  commencement_date DATE NOT NULL,
  remarks TEXT,
  recorded_by UUID NOT NULL,
  recorded_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.memo_progress_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memo_id UUID NOT NULL,
  progress_percent INTEGER NOT NULL,
  status_note TEXT,
  evidence_url TEXT,
  report_date DATE NOT NULL,
  reported_by UUID NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.memo_releases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memo_id UUID NOT NULL,
  released_amount NUMERIC(18,2) NOT NULL,
  released_by UUID NOT NULL,
  remarks TEXT,
  released_at TIMESTAMP DEFAULT NOW(),
  rejection_reason TEXT,
  next_release_date DATE,
  release_percentage NUMERIC(5,2),
  decision_type VARCHAR(30),
  next_payment_date DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE public.memo_releases ADD COLUMN IF NOT EXISTS next_payment_date DATE;
ALTER TABLE public.memo_releases ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

CREATE TABLE IF NOT EXISTS public.memo_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memo_id UUID NOT NULL,
  validation_note TEXT,
  is_valid BOOLEAN NOT NULL,
  validated_by UUID NOT NULL,
  validated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memo_id UUID,
  target_user_id UUID,
  target_role VARCHAR(50),
  type VARCHAR(100) NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMP,
  expires_at TIMESTAMP,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id UUID,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE public.audit_logs
ALTER COLUMN entity_id DROP NOT NULL;

CREATE TABLE IF NOT EXISTS public.sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name VARCHAR(100) NOT NULL,
  record_sync_id UUID NOT NULL,
  operation VARCHAR(20) NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
  retry_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sync_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name VARCHAR(100) NOT NULL,
  record_sync_id UUID NOT NULL,
  local_payload JSONB,
  server_payload JSONB,
  resolution VARCHAR(100),
  resolved_by UUID,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS organizational_units_code_unique_idx
ON public.organizational_units (code);

INSERT INTO public.organizational_units (code, name, unit_type)
VALUES
  ('P&P', 'POLICY AND PLANS BRANCH', 'HQ_BRANCH'),
  ('TRG', 'TRAINING BRANCH', 'HQ_BRANCH'),
  ('OPS', 'OPERATIONS BRANCH', 'HQ_BRANCH'),
  ('AINT', 'AIR INTELLIGENCE BRANCH', 'HQ_BRANCH'),
  ('AENG', 'AIRCRAFT ENGINEERING BRANCH', 'HQ_BRANCH'),
  ('CIS', 'COMMUNICATION AND INFORMATION SYSTEMS BRANCH', 'HQ_BRANCH'),
  ('LOG', 'LOGISTICS BRANCH', 'HQ_BRANCH'),
  ('ADMIN', 'ADMINISTRATION BRANCH', 'HQ_BRANCH'),
  ('AS', 'AIR SECRETARY BRANCH', 'HQ_BRANCH'),
  ('A&B', 'ACCOUNTS AND BUDGET BRANCH', 'HQ_BRANCH'),
  ('MED', 'MEDICAL SERVICES BRANCH', 'HQ_BRANCH'),
  ('T&I', 'TRANSFORMATION AND INNOVATION BRANCH', 'HQ_BRANCH'),
  ('CMR', 'CIVIL MILITARY RELATION BRANCH', 'HQ_BRANCH'),
  ('PIMT', 'PIMT', 'DIRECT_TO_CAS_OFFICE'),
  ('BOSE', 'BOSE', 'DIRECT_TO_CAS_OFFICE'),
  ('DAP', 'DIRECTORATE OF AIR POLICE', 'DIRECT_TO_CAS_OFFICE'),
  ('DPROC', 'DIRECTORATE OF PROCUREMENT', 'DIRECT_TO_CAS_OFFICE'),
  ('DPRINFO', 'DIRECTORATE OF PUBLIC RELATIONS & INFO', 'DIRECT_TO_CAS_OFFICE')
ON CONFLICT (code) DO UPDATE
SET
  name = EXCLUDED.name,
  unit_type = EXCLUDED.unit_type,
  is_active = TRUE,
  updated_at = NOW();

CREATE INDEX IF NOT EXISTS idx_memos_reference_no ON public.memos (reference_no);
CREATE INDEX IF NOT EXISTS idx_memos_category ON public.memos (category);
CREATE INDEX IF NOT EXISTS idx_memos_branch_dru ON public.memos (branch_dru);
CREATE INDEX IF NOT EXISTS idx_memos_approval_status ON public.memos (approval_status);
CREATE INDEX IF NOT EXISTS idx_memos_lifecycle_stage ON public.memos (lifecycle_stage);
CREATE INDEX IF NOT EXISTS idx_memos_business_status ON public.memos (business_status);
CREATE INDEX IF NOT EXISTS idx_memos_created_at ON public.memos (created_at);
CREATE INDEX IF NOT EXISTS idx_memos_updated_at ON public.memos (updated_at);
CREATE INDEX IF NOT EXISTS idx_memos_is_completed ON public.memos (is_completed);
CREATE INDEX IF NOT EXISTS idx_memos_version ON public.memos (version);
CREATE INDEX IF NOT EXISTS idx_memos_sync_id ON public.memos (sync_id);

CREATE INDEX IF NOT EXISTS idx_memo_assignments_memo_id ON public.memo_assignments (memo_id);
CREATE INDEX IF NOT EXISTS idx_memo_assignments_monitor_branch ON public.memo_assignments (primary_monitor_branch);
CREATE INDEX IF NOT EXISTS idx_memo_assignments_validator_branch ON public.memo_assignments (validator_branch);
CREATE INDEX IF NOT EXISTS idx_memo_assignments_assigned_user ON public.memo_assignments (assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_memo_assignments_validator_user ON public.memo_assignments (assigned_validator_user_id);

CREATE INDEX IF NOT EXISTS idx_memo_releases_memo_id ON public.memo_releases (memo_id);
CREATE INDEX IF NOT EXISTS idx_memo_releases_decision_type ON public.memo_releases (decision_type);
CREATE INDEX IF NOT EXISTS idx_memo_releases_released_at ON public.memo_releases (released_at);

CREATE INDEX IF NOT EXISTS idx_memo_progress_logs_memo_id ON public.memo_progress_logs (memo_id);
CREATE INDEX IF NOT EXISTS idx_memo_progress_logs_reported_by ON public.memo_progress_logs (reported_by);
CREATE INDEX IF NOT EXISTS idx_memo_progress_logs_report_date ON public.memo_progress_logs (report_date);

CREATE INDEX IF NOT EXISTS idx_memo_validations_memo_id ON public.memo_validations (memo_id);
CREATE INDEX IF NOT EXISTS idx_memo_commencements_memo_id ON public.memo_commencements (memo_id);
CREATE INDEX IF NOT EXISTS idx_memo_attachments_memo_id ON public.memo_attachments (memo_id);
CREATE INDEX IF NOT EXISTS idx_memo_attachments_created_at ON public.memo_attachments (created_at);

CREATE INDEX IF NOT EXISTS idx_notifications_visibility
ON public.notifications (target_user_id, target_role, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_dedupe
ON public.notifications (type, memo_id, target_role, target_user_id, is_read);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs (created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_sync_queue_created_at ON public.sync_queue (created_at);
CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON public.sync_queue (status);
CREATE INDEX IF NOT EXISTS idx_sync_conflicts_created_at ON public.sync_conflicts (created_at);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'memos_created_by_fkey') THEN
    ALTER TABLE public.memos ADD CONSTRAINT memos_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'memos_approved_by_fkey') THEN
    ALTER TABLE public.memos ADD CONSTRAINT memos_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'memo_assignments_memo_id_fkey') THEN
    ALTER TABLE public.memo_assignments ADD CONSTRAINT memo_assignments_memo_id_fkey FOREIGN KEY (memo_id) REFERENCES public.memos(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'memo_assignments_assigned_by_fkey') THEN
    ALTER TABLE public.memo_assignments ADD CONSTRAINT memo_assignments_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'memo_assignments_assigned_to_user_id_fkey') THEN
    ALTER TABLE public.memo_assignments ADD CONSTRAINT memo_assignments_assigned_to_user_id_fkey FOREIGN KEY (assigned_to_user_id) REFERENCES public.users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'memo_assignments_assigned_validator_user_id_fkey') THEN
    ALTER TABLE public.memo_assignments ADD CONSTRAINT memo_assignments_assigned_validator_user_id_fkey FOREIGN KEY (assigned_validator_user_id) REFERENCES public.users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'memo_attachments_memo_id_fkey') THEN
    ALTER TABLE public.memo_attachments ADD CONSTRAINT memo_attachments_memo_id_fkey FOREIGN KEY (memo_id) REFERENCES public.memos(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'memo_attachments_uploaded_by_fkey') THEN
    ALTER TABLE public.memo_attachments ADD CONSTRAINT memo_attachments_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'memo_commencements_memo_id_fkey') THEN
    ALTER TABLE public.memo_commencements ADD CONSTRAINT memo_commencements_memo_id_fkey FOREIGN KEY (memo_id) REFERENCES public.memos(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'memo_commencements_recorded_by_fkey') THEN
    ALTER TABLE public.memo_commencements ADD CONSTRAINT memo_commencements_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES public.users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'memo_progress_logs_memo_id_fkey') THEN
    ALTER TABLE public.memo_progress_logs ADD CONSTRAINT memo_progress_logs_memo_id_fkey FOREIGN KEY (memo_id) REFERENCES public.memos(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'memo_progress_logs_reported_by_fkey') THEN
    ALTER TABLE public.memo_progress_logs ADD CONSTRAINT memo_progress_logs_reported_by_fkey FOREIGN KEY (reported_by) REFERENCES public.users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'memo_releases_memo_id_fkey') THEN
    ALTER TABLE public.memo_releases ADD CONSTRAINT memo_releases_memo_id_fkey FOREIGN KEY (memo_id) REFERENCES public.memos(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'memo_releases_released_by_fkey') THEN
    ALTER TABLE public.memo_releases ADD CONSTRAINT memo_releases_released_by_fkey FOREIGN KEY (released_by) REFERENCES public.users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'memo_validations_memo_id_fkey') THEN
    ALTER TABLE public.memo_validations ADD CONSTRAINT memo_validations_memo_id_fkey FOREIGN KEY (memo_id) REFERENCES public.memos(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'memo_validations_validated_by_fkey') THEN
    ALTER TABLE public.memo_validations ADD CONSTRAINT memo_validations_validated_by_fkey FOREIGN KEY (validated_by) REFERENCES public.users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notifications_memo_id_fkey') THEN
    ALTER TABLE public.notifications ADD CONSTRAINT notifications_memo_id_fkey FOREIGN KEY (memo_id) REFERENCES public.memos(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notifications_target_user_id_fkey') THEN
    ALTER TABLE public.notifications ADD CONSTRAINT notifications_target_user_id_fkey FOREIGN KEY (target_user_id) REFERENCES public.users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'audit_logs_user_id_fkey') THEN
    ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public._cfps_migrations (
  filename TEXT PRIMARY KEY,
  applied_at TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO public._cfps_migrations (filename)
VALUES
  ('000_schema_baseline.sql'),
  ('006_memo_attachments.sql'),
  ('007_notifications.sql'),
  ('008_organizational_units.sql'),
  ('009_memo_state_location.sql'),
  ('010_uat_observation_fields.sql'),
  ('011_assigned_validator_user.sql'),
  ('012_users_compat_columns.sql'),
  ('supabase_complete_schema_safe.sql')
ON CONFLICT (filename) DO NOTHING;

COMMIT;
