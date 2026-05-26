ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0;

UPDATE public.users
SET token_version = 0
WHERE token_version IS NULL;
