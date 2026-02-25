

# Deploy: Tier CHECK Constraint + Helper Function (Tightened)

## Classification: YELLOW
Touches entitlement schema. No destructive changes.

## What this does
Adds database-level validation preventing invalid tier names, and a single-source-of-truth function for tier profile limits. Two improvements over the previous draft:
1. Constraint lookup scoped to table + schema (avoids rare name collisions)
2. `search_path` set without quotes (standard form)

## Migration SQL (single migration)

```sql
-- Step 1: Add CHECK constraint (idempotent, table-scoped)
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
      CHECK (tier IN ('starter', 'growth', 'professional', 'enterprise'))
      NOT VALID;
  END IF;
END $$;

-- Step 2: Validate
ALTER TABLE public.entitlements
  VALIDATE CONSTRAINT entitlements_tier_check;

-- Step 3: Create helper function
CREATE OR REPLACE FUNCTION public.get_tier_profile_limit(p_tier text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
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
```

## Post-deploy verification

```sql
SELECT public.get_tier_profile_limit('starter');       -- 25
SELECT public.get_tier_profile_limit('growth');        -- 75
SELECT public.get_tier_profile_limit('professional');  -- 200
SELECT public.get_tier_profile_limit('enterprise');    -- 2147483647
SELECT public.get_tier_profile_limit('invalid');       -- 25

SELECT conname, convalidated
FROM pg_constraint
WHERE conname = 'entitlements_tier_check';
-- expect: convalidated = true
```

## Rollback

```sql
ALTER TABLE public.entitlements
  DROP CONSTRAINT IF EXISTS entitlements_tier_check;
DROP FUNCTION IF EXISTS public.get_tier_profile_limit(text);
```

## What is NOT included
- No trigger on `activate_personnel` — separate step
- No code changes — schema-only
- Strategic note acknowledged: long-term, enterprise bypass should use `is_unlimited = true` rather than relying on `2147483647`

## Risk
- Preflight confirmed: 1 row, tier = `enterprise` — clean
- No RLS, auth, or edge function changes
- Additive only, fully reversible

