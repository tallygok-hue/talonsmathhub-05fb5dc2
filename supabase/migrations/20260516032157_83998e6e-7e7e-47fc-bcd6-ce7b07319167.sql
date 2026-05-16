CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.hash_password(_password text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT extensions.crypt(_password, extensions.gen_salt('bf'))
$$;

CREATE OR REPLACE FUNCTION public.verify_password(_account_id uuid, _password text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.accounts
    WHERE id = _account_id
      AND password_hash = extensions.crypt(_password, password_hash)
      AND banned = false
  )
$$;

ALTER TABLE public.active_sessions
  ALTER COLUMN code_id DROP NOT NULL;

ALTER TABLE public.chat_messages
  ALTER COLUMN code_id DROP NOT NULL;

ALTER TABLE public.poll_votes
  ALTER COLUMN code_id DROP NOT NULL;

ALTER TABLE public.game_plays
  ALTER COLUMN code_id DROP NOT NULL;

ALTER TABLE public.code_favorites
  ALTER COLUMN code_id DROP NOT NULL;

ALTER TABLE public.code_progress
  ALTER COLUMN code_id DROP NOT NULL;

ALTER TABLE public.user_requests
  ALTER COLUMN code_id DROP NOT NULL;

ALTER TABLE public.session_screens
  ALTER COLUMN code_id DROP NOT NULL;