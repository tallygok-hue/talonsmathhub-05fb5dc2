-- Remove publicly readable SELECT policies on chat_messages and poll_votes.
-- All reads happen server-side via the game-api edge function (service role).
DROP POLICY IF EXISTS "Public can read chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "anyone can read votes" ON public.poll_votes;

-- Add a small server-side login attempt tracker for rate limiting
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip text NOT NULL,
  success boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS login_attempts_ip_time_idx ON public.login_attempts (ip, created_at DESC);
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
-- No policies: only the service role (edge functions) may read/write.