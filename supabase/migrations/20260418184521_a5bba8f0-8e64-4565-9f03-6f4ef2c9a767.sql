-- Create user_requests table for feedback / complaints / requests
CREATE TABLE public.user_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id uuid NOT NULL,
  username text NOT NULL,
  category text NOT NULL DEFAULT 'request',
  message text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  admin_response text,
  notified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz
);

ALTER TABLE public.user_requests ENABLE ROW LEVEL SECURITY;

-- Lock down direct access (edge function uses service role; client uses realtime which bypasses RLS for subscribers we configure server-side)
CREATE POLICY "No direct access to user_requests"
  ON public.user_requests FOR SELECT
  USING (false);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_requests;
ALTER TABLE public.user_requests REPLICA IDENTITY FULL;

CREATE INDEX idx_user_requests_code_id ON public.user_requests(code_id);
CREATE INDEX idx_user_requests_status ON public.user_requests(status);
CREATE INDEX idx_user_requests_created_at ON public.user_requests(created_at DESC);