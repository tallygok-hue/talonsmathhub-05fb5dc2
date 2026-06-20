-- Daily point claim tracker (to gate poll/request rewards)
CREATE TABLE public.daily_point_claims (
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  claim_key text NOT NULL,
  claim_date date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (account_id, claim_key, claim_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_point_claims TO authenticated;
GRANT ALL ON public.daily_point_claims TO service_role;
ALTER TABLE public.daily_point_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role only" ON public.daily_point_claims FOR ALL USING (false) WITH CHECK (false);

-- Gamble pity tracker
CREATE TABLE public.gamble_pity (
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  tier text NOT NULL,
  loss_streak integer NOT NULL DEFAULT 0,
  total_lost integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (account_id, tier)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gamble_pity TO authenticated;
GRANT ALL ON public.gamble_pity TO service_role;
ALTER TABLE public.gamble_pity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role only" ON public.gamble_pity FOR ALL USING (false) WITH CHECK (false);

-- Seed moderator permission definitions (idempotent)
INSERT INTO public.permissions (key, label, description) VALUES
  ('mod.timeout', 'Moderator: Timeout', 'Can timeout users from chat (capped duration)'),
  ('mod.delete_chat', 'Moderator: Delete chat', 'Can delete chat messages'),
  ('mod.adjust_points', 'Moderator: Adjust points', 'Can adjust user points (capped)')
ON CONFLICT (key) DO NOTHING;