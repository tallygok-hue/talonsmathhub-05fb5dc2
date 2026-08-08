CREATE TABLE IF NOT EXISTS public.system_status (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  status text NOT NULL DEFAULT 'operational',
  message text,
  last_incident_at timestamptz NOT NULL DEFAULT now(),
  last_incident_note text,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.system_status TO anon;
GRANT SELECT ON public.system_status TO authenticated;
GRANT ALL ON public.system_status TO service_role;

ALTER TABLE public.system_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "system_status public read" ON public.system_status;
CREATE POLICY "system_status public read" ON public.system_status FOR SELECT USING (true);

DROP POLICY IF EXISTS "system_status no client writes" ON public.system_status;
CREATE POLICY "system_status no client writes" ON public.system_status AS RESTRICTIVE FOR ALL USING (false) WITH CHECK (false);

INSERT INTO public.system_status (id, status, message)
VALUES (true, 'operational', 'All systems operational')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.chat_reports ADD COLUMN IF NOT EXISTS ai_severity text;
ALTER TABLE public.chat_reports ADD COLUMN IF NOT EXISTS ai_summary text;
ALTER TABLE public.chat_reports ADD COLUMN IF NOT EXISTS ai_action text;
ALTER TABLE public.chat_reports ADD COLUMN IF NOT EXISTS ai_reviewed_at timestamptz;
ALTER TABLE public.chat_reports ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'user';