REVOKE ALL ON FUNCTION public.hash_password(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.hash_password(text) FROM anon;
REVOKE ALL ON FUNCTION public.hash_password(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.hash_password(text) TO service_role;

REVOKE ALL ON FUNCTION public.verify_password(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.verify_password(uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.verify_password(uuid, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.verify_password(uuid, text) TO service_role;