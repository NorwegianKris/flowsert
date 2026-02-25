-- Stage 0 Hardening: Tier CHECK + Tier Limit Function

-- 1) Add CHECK constraint on entitlements.tier (if missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE c.conname = 'entitlements_tier_check'
      AND n.nspname = 'public'
      AND t.relname = 'entitlements'
  ) THEN
    ALTER TABLE public.entitlements
      ADD CONSTRAINT entitlements_tier_check
      CHECK (tier IN ('starter', 'growth', 'professional', 'enterprise'));
  END IF;
END $$;

-- 2) Create tier → profile limit lookup function
CREATE OR REPLACE FUNCTION public.get_tier_profile_limit(p_tier text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path TO public
AS $$
  SELECT CASE p_tier
    WHEN 'starter'      THEN 25
    WHEN 'growth'       THEN 75
    WHEN 'professional' THEN 200
    WHEN 'enterprise'   THEN 2147483647
    ELSE 25
  END;
$$;