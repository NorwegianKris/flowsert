

# Temporarily Replace starter_monthly with 10 NOK Price ID

## What changes

Replace `starter_monthly` price ID from `price_1T4TiBCTVQHwswgoMCQBB0Kv` to `price_1T4UM3CTVQHwswgojzCUGSYV` in three files:

| File | What changes |
|------|-------------|
| `src/lib/stripePrices.ts` | `starter_monthly` value → new price ID |
| `supabase/functions/create-checkout-session/index.ts` | Replace old ID with new in `ALLOWED_PRICE_IDS` |
| `supabase/functions/stripe-webhook/index.ts` | Replace old ID with new in `TIER_MAP` |

## Security anchor

- Q2 (edge functions): 🔴 anchor required before publish
- No schema changes, no RLS changes

## Technical detail

All three files have the old price ID `price_1T4TiBCTVQHwswgoMCQBB0Kv` hardcoded. Each occurrence is swapped to `price_1T4UM3CTVQHwswgojzCUGSYV`. Both edge functions will be redeployed automatically.

