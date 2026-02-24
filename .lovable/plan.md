

# Update Stripe Price IDs to Live Mode

## Summary
Replace all test-mode Stripe price IDs with live-mode price IDs across three files, updated atomically.

## Note on shared config
Edge functions run in Deno and cannot import from `src/`, so the `ALLOWED_PRICE_IDS` set in `create-checkout-session/index.ts` and `TIER_MAP` in `stripe-webhook/index.ts` must be hardcoded. All three files will be updated in the same change to keep them in sync.

## Changes

### 1. `src/lib/stripePrices.ts`
Replace the `PRICE_MAP` values with the six new live-mode price IDs. Keep all other exports (`TIER_INFO`, `getPriceId`, types) unchanged.

### 2. `supabase/functions/stripe-webhook/index.ts`
Replace the six `TIER_MAP` keys with the new live-mode price IDs. Tier/cap/unlimited values stay the same.

### 3. `supabase/functions/create-checkout-session/index.ts`
Replace the six entries in the `ALLOWED_PRICE_IDS` set with the new live-mode price IDs.

## New Price IDs

| Key | New Live Price ID |
|-----|------------------|
| starter_monthly | price_1T4TiBCTVQHwswgoMCQBB0Kv |
| starter_annual | price_1T4TipCTVQHwswgo3i7Wxi0p |
| growth_monthly | price_1T4TjxCTVQHwswgobYyRRe10 |
| growth_annual | price_1T4TkFCTVQHwswgop7yCPQRM |
| professional_monthly | price_1T4TksCTVQHwswgoItMP8J6n |
| professional_annual | price_1T4Tl8CTVQHwswgoHkYuB2S9 |

## Post-deploy
After the code changes deploy, you will need to update `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` to their live-mode values.

## Security Anchors
- Q2 (edge functions): Two edge functions modified -- anchor required before publish.
- All three files updated atomically to prevent price mismatch.

| File | Action |
|------|--------|
| src/lib/stripePrices.ts | Edit -- replace 6 price IDs |
| supabase/functions/stripe-webhook/index.ts | Edit -- replace TIER_MAP keys |
| supabase/functions/create-checkout-session/index.ts | Edit -- replace ALLOWED_PRICE_IDS entries |

