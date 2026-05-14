ALTER TABLE public.active_sessions
  ADD COLUMN IF NOT EXISTS current_view text,
  ADD COLUMN IF NOT EXISTS current_game text,
  ADD COLUMN IF NOT EXISTS current_url text;

CREATE TABLE IF NOT EXISTS public.session_screens (
  session_token text PRIMARY KEY,
  code_id uuid NOT NULL,
  username text NOT NULL,
  screenshot text NOT NULL,
  width int,
  height int,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.session_screens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no direct access screens" ON public.session_screens FOR SELECT USING (false);

CREATE TABLE IF NOT EXISTS public.game_plays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id uuid NOT NULL,
  username text NOT NULL,
  game_id text NOT NULL,
  game_name text,
  played_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_game_plays_game ON public.game_plays(game_id);
CREATE INDEX IF NOT EXISTS idx_game_plays_played_at ON public.game_plays(played_at DESC);
ALTER TABLE public.game_plays ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no direct access plays" ON public.game_plays FOR SELECT USING (false);

CREATE TABLE IF NOT EXISTS public.polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  options jsonb NOT NULL,
  active boolean NOT NULL DEFAULT true,
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone can read polls" ON public.polls FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.poll_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  code_id uuid NOT NULL,
  option_index int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (poll_id, code_id)
);
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone can read votes" ON public.poll_votes FOR SELECT USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.session_screens;
ALTER PUBLICATION supabase_realtime ADD TABLE public.polls;
ALTER PUBLICATION supabase_realtime ADD TABLE public.poll_votes;