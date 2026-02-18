REVOKE EXECUTE ON FUNCTION public.enforce_rate_limit(text,int,int) FROM anon;
REVOKE EXECUTE ON FUNCTION public.trg_limit_direct_messages() FROM anon;