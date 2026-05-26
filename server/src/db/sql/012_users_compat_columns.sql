CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'VIEWER',
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS full_name VARCHAR(150);

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS branch_dru VARCHAR(150);

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0;

UPDATE public.users
SET full_name = username
WHERE full_name IS NULL OR BTRIM(full_name) = '';

UPDATE public.users
SET is_active = TRUE
WHERE is_active IS NULL;

UPDATE public.users
SET updated_at = NOW()
WHERE updated_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS users_username_unique_idx
ON public.users (username);
