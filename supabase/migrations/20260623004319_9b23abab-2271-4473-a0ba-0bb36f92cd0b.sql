
CREATE OR REPLACE FUNCTION public.purge_old_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r jsonb := '{}'::jsonb;
  n int;
BEGIN
  DELETE FROM public.session_screens WHERE updated_at < now() - interval '1 hour';
  GET DIAGNOSTICS n = ROW_COUNT; r := r || jsonb_build_object('session_screens', n);

  DELETE FROM public.login_logs WHERE created_at < now() - interval '14 days';
  GET DIAGNOSTICS n = ROW_COUNT; r := r || jsonb_build_object('login_logs', n);

  DELETE FROM public.login_attempts WHERE created_at < now() - interval '7 days';
  GET DIAGNOSTICS n = ROW_COUNT; r := r || jsonb_build_object('login_attempts', n);

  DELETE FROM public.point_transactions WHERE created_at < now() - interval '60 days';
  GET DIAGNOSTICS n = ROW_COUNT; r := r || jsonb_build_object('point_transactions', n);

  DELETE FROM public.gamble_logs WHERE created_at < now() - interval '60 days';
  GET DIAGNOSTICS n = ROW_COUNT; r := r || jsonb_build_object('gamble_logs', n);

  DELETE FROM public.audit_logs WHERE created_at < now() - interval '30 days';
  GET DIAGNOSTICS n = ROW_COUNT; r := r || jsonb_build_object('audit_logs', n);

  DELETE FROM public.chat_messages WHERE created_at < now() - interval '7 days';
  GET DIAGNOSTICS n = ROW_COUNT; r := r || jsonb_build_object('chat_messages', n);

  DELETE FROM public.active_sessions WHERE last_active < now() - interval '1 day';
  GET DIAGNOSTICS n = ROW_COUNT; r := r || jsonb_build_object('active_sessions', n);

  RETURN r;
END
$$;

REVOKE ALL ON FUNCTION public.purge_old_data() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purge_old_data() TO service_role;

-- Run once immediately to free space now
SELECT public.purge_old_data();
