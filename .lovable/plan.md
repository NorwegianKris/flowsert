

# Stage 0 Hardening: Tier CHECK + get_tier_profile_limit()

**Classification: YELLOW** — Additive schema guards, no data changes, no RLS changes.

## Migration

Single SQL migration applying exactly the user-provided SQL:

1. **Idempotent CHECK constraint** `entitlements_tier_check` on `public.entitlements.tier` — restricts values to `starter`, `growth`, `professional`, `enterprise`
2. **Immutable function** `public.get_tier_profile_limit(p_tier text)` — maps tier to seat cap (25, 75, 200, 2147483647)

## Post-migration verification

Four queries to confirm:
- CHECK constraint exists and is validated
- Function exists in `pg_proc`
- Function returns correct values for all four tiers

## What this does NOT touch

- No data modifications
- No RLS policy changes
- No changes to `entitlements.profile_cap`
- No edge function changes
- No frontend code changes

## Risk

Zero. Both objects are additive. The CHECK constraint will fail to add only if an existing row has an invalid tier value — which would itself be a bug worth catching now.

