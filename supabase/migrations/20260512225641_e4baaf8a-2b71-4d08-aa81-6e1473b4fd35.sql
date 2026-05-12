
-- Device bans (school WiFi shares IPs, so we ban a hardware/browser fingerprint)
CREATE TABLE public.banned_devices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_hash TEXT NOT NULL UNIQUE,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_username TEXT,
  last_user_agent TEXT
);
ALTER TABLE public.banned_devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No direct access" ON public.banned_devices FOR SELECT USING (false);

-- Track device fingerprint on logs and sessions
ALTER TABLE public.login_logs ADD COLUMN IF NOT EXISTS device_hash TEXT;
ALTER TABLE public.active_sessions ADD COLUMN IF NOT EXISTS device_hash TEXT;
CREATE INDEX IF NOT EXISTS idx_login_logs_device ON public.login_logs(device_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_device ON public.active_sessions(device_hash);
