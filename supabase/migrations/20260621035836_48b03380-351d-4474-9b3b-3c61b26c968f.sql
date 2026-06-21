
-- Add explicit deny-all write policies (USING/WITH CHECK false) for every table
-- that has RLS enabled and currently lacks explicit write policies. Service role
-- bypasses RLS so the edge function continues to work unchanged.

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'access_codes','account_inventory','account_permissions','accounts',
    'active_sessions','announcement_acks','announcements','audit_logs',
    'banned_devices','chat_messages','chat_reports','chat_uploads',
    'code_favorites','code_progress','gamble_logs','game_plays',
    'login_attempts','login_logs','pack_definitions','permissions',
    'point_multipliers','point_transactions','poll_votes','polls',
    'quest_progress','quests','session_screens','shop_items',
    'update_log_acks','update_logs','user_requests','weekly_poll_templates',
    'feature_flags'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS "deny direct writes" ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY "deny direct writes" ON public.%I AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false)',
      t
    );
  END LOOP;
END $$;

-- Remove highly sensitive tables from Realtime publication.
-- Admin views (LiveMonitor) already poll these every few seconds.
ALTER PUBLICATION supabase_realtime DROP TABLE public.session_screens;
ALTER PUBLICATION supabase_realtime DROP TABLE public.active_sessions;
