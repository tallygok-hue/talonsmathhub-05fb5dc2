-- Profile fields
ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS avatar_emoji text NOT NULL DEFAULT '🎮',
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS name_color text NOT NULL DEFAULT '#a78bfa';

-- Permission helper
CREATE OR REPLACE FUNCTION public.has_permission(_account_id uuid, _key text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.accounts a
    WHERE a.id = _account_id AND a.role = 'admin'
  ) OR EXISTS (
    SELECT 1 FROM public.account_permissions p
    WHERE p.account_id = _account_id AND p.permission_key = _key
  )
$$;

-- Seed canonical permission keys (idempotent)
INSERT INTO public.permissions (key, label, description) VALUES
  ('chat.moderate',     'Moderate Chat',         'Delete messages, mute, resolve reports'),
  ('users.manage',      'Manage Users',          'Ban, unban, edit accounts'),
  ('economy.manage',    'Manage Economy',        'Adjust points, run multipliers'),
  ('polls.manage',      'Manage Polls',          'Create, close, archive polls'),
  ('packs.manage',      'Manage Packs',          'Create and edit packs'),
  ('flags.manage',      'Manage Feature Flags',  'Toggle feature flags'),
  ('multipliers.manage','Manage Multipliers',    'Schedule point multipliers'),
  ('audit.view',        'View Audit Log',        'Read the audit log')
ON CONFLICT (key) DO NOTHING;