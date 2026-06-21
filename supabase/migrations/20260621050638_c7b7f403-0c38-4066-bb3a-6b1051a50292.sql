ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS last_chat_award_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_chat_text text;