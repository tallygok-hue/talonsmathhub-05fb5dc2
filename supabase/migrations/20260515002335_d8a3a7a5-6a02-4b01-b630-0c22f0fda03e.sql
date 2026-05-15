
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ACCOUNTS
CREATE TABLE IF NOT EXISTS public.accounts (
  id UUID NOT NULL PRIMARY KEY,
  username TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  banned BOOLEAN NOT NULL DEFAULT false,
  muted_until TIMESTAMPTZ,
  must_set_username BOOLEAN NOT NULL DEFAULT true,
  points INTEGER NOT NULL DEFAULT 0,
  total_earned INTEGER NOT NULL DEFAULT 0,
  chat_count INTEGER NOT NULL DEFAULT 0,
  streak_days INTEGER NOT NULL DEFAULT 0,
  last_chat_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  last_streak_date DATE,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  inventory JSONB NOT NULL DEFAULT '[]'::jsonb,
  equipped JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "no direct accounts" ON public.accounts;
CREATE POLICY "no direct accounts" ON public.accounts FOR SELECT USING (false);
CREATE INDEX IF NOT EXISTS idx_accounts_username ON public.accounts (LOWER(username));

INSERT INTO public.accounts (id, username, password_hash, role, must_set_username, created_at)
SELECT
  c.id,
  NULL,
  extensions.crypt(c.code, extensions.gen_salt('bf')),
  CASE WHEN c.is_admin THEN 'admin' ELSE 'user' END,
  true,
  c.created_at
FROM public.access_codes c
ON CONFLICT (id) DO NOTHING;

-- PERMISSIONS
CREATE TABLE IF NOT EXISTS public.permissions (
  key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "no direct perms" ON public.permissions;
CREATE POLICY "no direct perms" ON public.permissions FOR SELECT USING (false);

CREATE TABLE IF NOT EXISTS public.account_permissions (
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  permission_key TEXT NOT NULL REFERENCES public.permissions(key) ON DELETE CASCADE,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  granted_by UUID,
  PRIMARY KEY (account_id, permission_key)
);
ALTER TABLE public.account_permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "no direct ap" ON public.account_permissions;
CREATE POLICY "no direct ap" ON public.account_permissions FOR SELECT USING (false);

INSERT INTO public.permissions (key, label, description) VALUES
  ('chat.image_upload',  'Chat: image / GIF upload', 'Send images and GIFs in chat'),
  ('chat.fast',          'Chat: faster rate limit',  'Bypass standard 2s chat cooldown'),
  ('chat.color',         'Chat: custom username color', 'Pick a username color in chat'),
  ('chat.tag',           'Chat: animated tag',       'Show an animated tag next to your name'),
  ('chat.pin',           'Chat: pin own message',    'Pin one of your own messages at a time'),
  ('chat.highlight',     'Chat: message highlight',  'Highlight your own messages'),
  ('economy.bigger_bets','Economy: bigger gambling caps', 'Higher bet ceiling in gambling games'),
  ('economy.exclusive_packs','Economy: exclusive packs','Access seasonal/exclusive pack drops'),
  ('access.beta_games',  'Access: beta games',       'Play games hidden from regular users'),
  ('access.double_vote', 'Access: double vote in polls', 'Your poll vote counts twice'),
  ('vanity.join_sound',  'Vanity: custom join sound','Play a custom sound when you log in'),
  ('vanity.profile_bg',  'Vanity: animated profile bg','Animated background on your profile')
ON CONFLICT (key) DO NOTHING;

-- POINTS
CREATE TABLE IF NOT EXISTS public.point_multipliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  multiplier NUMERIC(4,2) NOT NULL DEFAULT 2.00,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.point_multipliers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "no direct mult" ON public.point_multipliers;
CREATE POLICY "no direct mult" ON public.point_multipliers FOR SELECT USING (false);

CREATE TABLE IF NOT EXISTS public.point_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "no direct tx" ON public.point_transactions;
CREATE POLICY "no direct tx" ON public.point_transactions FOR SELECT USING (false);
CREATE INDEX IF NOT EXISTS idx_pt_account ON public.point_transactions (account_id, created_at DESC);

-- QUESTS
CREATE TABLE IF NOT EXISTS public.quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  quest_type TEXT NOT NULL,
  goal INTEGER NOT NULL DEFAULT 1,
  reward INTEGER NOT NULL DEFAULT 50,
  metric TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.quests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "no direct quests" ON public.quests;
CREATE POLICY "no direct quests" ON public.quests FOR SELECT USING (false);

CREATE TABLE IF NOT EXISTS public.quest_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  quest_id UUID NOT NULL REFERENCES public.quests(id) ON DELETE CASCADE,
  progress INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT false,
  claimed BOOLEAN NOT NULL DEFAULT false,
  period_key TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (account_id, quest_id, period_key)
);
ALTER TABLE public.quest_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "no direct qp" ON public.quest_progress;
CREATE POLICY "no direct qp" ON public.quest_progress FOR SELECT USING (false);

INSERT INTO public.quests (key, title, description, quest_type, goal, reward, metric) VALUES
  ('daily_chat_10', 'Chat 10 times', 'Send 10 messages in chat today.', 'daily', 10, 50, 'chat'),
  ('daily_play_3',  'Play 3 games',  'Launch 3 different games today.', 'daily', 3, 75, 'play'),
  ('daily_login',   'Daily login',   'Log in today.', 'daily', 1, 25, 'login'),
  ('weekly_chat_100','Chat 100 times','Send 100 messages this week.', 'weekly', 100, 400, 'chat'),
  ('weekly_play_15','Play 15 games', 'Launch 15 games this week.', 'weekly', 15, 350, 'play'),
  ('weekly_poll',   'Vote in weekly poll', 'Vote in this week''s poll.', 'weekly', 1, 100, 'poll_vote')
ON CONFLICT (key) DO NOTHING;

-- ANNOUNCEMENTS + UPDATE NOTES
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  dismissable BOOLEAN NOT NULL DEFAULT true,
  active BOOLEAN NOT NULL DEFAULT true,
  target TEXT NOT NULL DEFAULT 'all',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "no direct ann" ON public.announcements;
CREATE POLICY "no direct ann" ON public.announcements FOR SELECT USING (false);

CREATE TABLE IF NOT EXISTS public.announcement_acks (
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  acked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (account_id, announcement_id)
);
ALTER TABLE public.announcement_acks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "no direct annacks" ON public.announcement_acks;
CREATE POLICY "no direct annacks" ON public.announcement_acks FOR SELECT USING (false);

CREATE TABLE IF NOT EXISTS public.update_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL,
  title TEXT NOT NULL,
  body_md TEXT NOT NULL DEFAULT '',
  highlights JSONB NOT NULL DEFAULT '[]'::jsonb,
  severity TEXT NOT NULL DEFAULT 'info',
  target TEXT NOT NULL DEFAULT 'all',
  require_ack BOOLEAN NOT NULL DEFAULT false,
  published BOOLEAN NOT NULL DEFAULT true,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.update_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "no direct ul" ON public.update_logs;
CREATE POLICY "no direct ul" ON public.update_logs FOR SELECT USING (false);

CREATE TABLE IF NOT EXISTS public.update_log_acks (
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  update_log_id UUID NOT NULL REFERENCES public.update_logs(id) ON DELETE CASCADE,
  acked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (account_id, update_log_id)
);
ALTER TABLE public.update_log_acks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "no direct ulacks" ON public.update_log_acks;
CREATE POLICY "no direct ulacks" ON public.update_log_acks FOR SELECT USING (false);

INSERT INTO public.update_logs (version, title, body_md, highlights, severity, target, require_ack)
SELECT
  '2.0.0',
  'Welcome to Accounts',
  'We just rolled out **persistent accounts**. Your code is now your password. Pick a permanent username on your next login — it sticks across devices and unlocks points, quests, and more coming soon.',
  '["Permanent username + profile","Earn points by chatting & playing","Daily and weekly quests","Live leaderboards","Press Ctrl+Shift+G to toggle the games portal"]'::jsonb,
  'info',
  'all',
  false
WHERE NOT EXISTS (SELECT 1 FROM public.update_logs WHERE version = '2.0.0');

-- CHAT MOD + UPLOADS
CREATE TABLE IF NOT EXISTS public.chat_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL,
  reporter_account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.chat_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "no direct cr" ON public.chat_reports;
CREATE POLICY "no direct cr" ON public.chat_reports FOR SELECT USING (false);

CREATE TABLE IF NOT EXISTS public.chat_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  mime TEXT NOT NULL,
  bytes INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.chat_uploads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "no direct cu" ON public.chat_uploads;
CREATE POLICY "no direct cu" ON public.chat_uploads FOR SELECT USING (false);

ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS account_id UUID;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS image_url TEXT;
UPDATE public.chat_messages SET account_id = code_id WHERE account_id IS NULL;

ALTER TABLE public.code_favorites ADD COLUMN IF NOT EXISTS account_id UUID;
UPDATE public.code_favorites SET account_id = code_id WHERE account_id IS NULL;
ALTER TABLE public.code_progress ADD COLUMN IF NOT EXISTS account_id UUID;
UPDATE public.code_progress SET account_id = code_id WHERE account_id IS NULL;
ALTER TABLE public.game_plays ADD COLUMN IF NOT EXISTS account_id UUID;
UPDATE public.game_plays SET account_id = code_id WHERE account_id IS NULL;
ALTER TABLE public.poll_votes ADD COLUMN IF NOT EXISTS account_id UUID;
UPDATE public.poll_votes SET account_id = code_id WHERE account_id IS NULL;
ALTER TABLE public.user_requests ADD COLUMN IF NOT EXISTS account_id UUID;
UPDATE public.user_requests SET account_id = code_id WHERE account_id IS NULL;
ALTER TABLE public.active_sessions ADD COLUMN IF NOT EXISTS account_id UUID;
UPDATE public.active_sessions SET account_id = code_id WHERE account_id IS NULL;
ALTER TABLE public.session_screens ADD COLUMN IF NOT EXISTS account_id UUID;
UPDATE public.session_screens SET account_id = code_id WHERE account_id IS NULL;

-- FEATURE FLAGS (publicly readable)
CREATE TABLE IF NOT EXISTS public.feature_flags (
  key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN NOT NULL DEFAULT false,
  scope TEXT NOT NULL DEFAULT 'all',
  scheduled_for TIMESTAMPTZ,
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anyone reads flags" ON public.feature_flags;
CREATE POLICY "anyone reads flags" ON public.feature_flags FOR SELECT USING (true);

ALTER TABLE public.feature_flags REPLICA IDENTITY FULL;

INSERT INTO public.feature_flags (key, label, description, enabled, scope) VALUES
  ('shop_enabled',        'Shop',                  'Enable the points shop',                      false, 'all'),
  ('cosmetics_enabled',   'Cosmetics',             'Enable cosmetic items in chat / profile',     false, 'all'),
  ('image_uploads_enabled','Chat image uploads',   'Honor chat.image_upload purchases',           false, 'all'),
  ('tab_cloaking_enabled','Tab cloaking',          'Per-account tab title + favicon cloaking',    false, 'all'),
  ('code_renaming_enabled','Code renaming',        'Neutralize obvious game references in UI',    false, 'all'),
  ('beta_games_enabled',  'Beta games',            'Show beta-only games to users with perm',     false, 'all'),
  ('gambling_enabled',    'Gambling (Phase 3)',    'Coinflip / dice / slots / jackpot / stocks',  false, 'all'),
  ('packs_enabled',       'Packs (Phase 4)',       'Blooket-style pack opening + collectibles',   false, 'all'),
  ('register_enabled',    'Public registration',   'Allow new users to register their own accounts', true, 'all')
ON CONFLICT (key) DO NOTHING;

-- AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_account_id UUID,
  action TEXT NOT NULL,
  target TEXT,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "no direct audit" ON public.audit_logs;
CREATE POLICY "no direct audit" ON public.audit_logs FOR SELECT USING (false);
CREATE INDEX IF NOT EXISTS idx_audit_created ON public.audit_logs (created_at DESC);

-- WEEKLY POLL TEMPLATES
CREATE TABLE IF NOT EXISTS public.weekly_poll_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  last_posted_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.weekly_poll_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "no direct wpt" ON public.weekly_poll_templates;
CREATE POLICY "no direct wpt" ON public.weekly_poll_templates FOR SELECT USING (false);

-- realtime
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.update_logs REPLICA IDENTITY FULL;
ALTER TABLE public.announcements REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.feature_flags';
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.update_logs';
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements';
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- CRON
DO $$
BEGIN
  PERFORM cron.unschedule(jobname) FROM cron.job
    WHERE jobname IN ('purge-old-chat-messages','purge-stale-sessions','sweep-multipliers');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'purge-old-chat-messages', '17 * * * *',
  $$ DELETE FROM public.chat_messages WHERE created_at < now() - interval '24 hours'; $$
);
SELECT cron.schedule(
  'purge-stale-sessions', '*/5 * * * *',
  $$ DELETE FROM public.active_sessions WHERE last_active < now() - interval '30 minutes'; $$
);
SELECT cron.schedule(
  'sweep-multipliers', '*/5 * * * *',
  $$ UPDATE public.point_multipliers SET active = false WHERE active = true AND ends_at < now(); $$
);
