
-- 1) Rate limit counter table
CREATE TABLE IF NOT EXISTS public.rate_limits (
  key TEXT PRIMARY KEY,
  window_start TIMESTAMPTZ NOT NULL,
  count INT NOT NULL
);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
-- No policies: only accessed by SECURITY DEFINER functions, never by client queries.

CREATE INDEX IF NOT EXISTS rate_limits_window_start_idx
ON public.rate_limits (window_start);

-- 2) Generic rate limiter function (fixed-window counter)
CREATE OR REPLACE FUNCTION public.enforce_rate_limit(
  p_key TEXT,
  p_limit INT,
  p_window_seconds INT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_now TIMESTAMPTZ := now();
  v_window_start TIMESTAMPTZ := to_timestamp(
    floor(extract(epoch FROM v_now) / p_window_seconds) * p_window_seconds
  );
BEGIN
  INSERT INTO public.rate_limits(key, window_start, count)
  VALUES (p_key, v_window_start, 1)
  ON CONFLICT (key) DO UPDATE
    SET count = CASE
        WHEN public.rate_limits.window_start = v_window_start
        THEN public.rate_limits.count + 1
        ELSE 1
      END,
      window_start = CASE
        WHEN public.rate_limits.window_start = v_window_start
        THEN public.rate_limits.window_start
        ELSE v_window_start
      END;

  IF (SELECT count FROM public.rate_limits WHERE key = p_key) > p_limit THEN
    RAISE EXCEPTION 'rate limit exceeded';
  END IF;
END;
$$;

-- Lock down execute privileges
REVOKE ALL ON FUNCTION public.enforce_rate_limit(TEXT, INT, INT) FROM public;
GRANT EXECUTE ON FUNCTION public.enforce_rate_limit(TEXT, INT, INT) TO authenticated;

-- 3) Direct messages trigger function (plain invoker, no SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.trg_limit_direct_messages()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.enforce_rate_limit(
    'direct_messages:' || auth.uid()::text,
    30,
    60
  );
  RETURN NEW;
END;
$$;

-- 4) Attach trigger
DROP TRIGGER IF EXISTS limit_direct_messages ON public.direct_messages;

CREATE TRIGGER limit_direct_messages
  BEFORE INSERT ON public.direct_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_limit_direct_messages();
