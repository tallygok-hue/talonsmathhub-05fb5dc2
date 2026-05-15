
-- Access codes table (replaces hardcoded codes)
CREATE TABLE IF NOT EXISTS public.access_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.access_codes ENABLE ROW LEVEL SECURITY;

-- No direct access - all via edge functions
CREATE POLICY "No direct access" ON public.access_codes FOR SELECT USING (false);

-- Favorites per code
CREATE TABLE public.code_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id UUID NOT NULL REFERENCES public.access_codes(id) ON DELETE CASCADE,
  game_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(code_id, game_id)
);

ALTER TABLE public.code_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No direct access" ON public.code_favorites FOR SELECT USING (false);

-- Progress per code (quiz scores, etc.)
CREATE TABLE public.code_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id UUID NOT NULL REFERENCES public.access_codes(id) ON DELETE CASCADE,
  progress_type TEXT NOT NULL, -- 'quiz', 'flashcard', etc.
  data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(code_id, progress_type)
);

ALTER TABLE public.code_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No direct access" ON public.code_progress FOR SELECT USING (false);

-- Active sessions
CREATE TABLE public.active_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id UUID NOT NULL REFERENCES public.access_codes(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  session_token TEXT NOT NULL UNIQUE,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_active TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No direct access" ON public.active_sessions FOR SELECT USING (false);

-- Login logs
CREATE TABLE public.login_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL,
  code_text TEXT,
  success BOOLEAN NOT NULL DEFAULT false,
  ip TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.login_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No direct access" ON public.login_logs FOR SELECT USING (false);

-- Enable realtime for sessions and access_codes so clients get instant updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.access_codes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.active_sessions;

-- Seed default codes
INSERT INTO public.access_codes (code, is_admin) VALUES
  ('admintalon', true);

INSERT INTO public.access_codes (code, is_admin) VALUES
  ('talon2024', false),
  ('mathgamer', false),
  ('unblockedftw', false),
  ('letmein99', false),
  ('gamer123', false);
