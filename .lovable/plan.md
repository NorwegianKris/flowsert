## Implementation: Billing Tables Migration + stripe-webhook Edge Function

**Status: IMPLEMENTED** ✅
**Risk: RED** -- New billing tables with RLS + public webhook writing billing/entitlement data.

---

### Step 1: Database Migration ✅

Created three tables (`billing_customers`, `billing_subscriptions`, `billing_events`) with:

- Full RLS: admin SELECT-only scoped to business_id, REVOKE INSERT/UPDATE/DELETE from authenticated
- `billing_subscriptions.stripe_subscription_id` is NOT NULL
- `trial_end` column on billing_subscriptions
- `updated_at` trigger using existing `update_updated_at_column()`
- Idempotency via `billing_events.stripe_event_id` UNIQUE
- NULL `business_id` rows in billing_events stay server-only
- Indexes on billing_events(business_id) and billing_events(stripe_subscription_id)

### Step 2: stripe-webhook Edge Function ✅

**File:** `supabase/functions/stripe-webhook/index.ts`

All requirements implemented:
- `stripe-signature` header validated; 400 on missing/invalid
- `event.data.object` used for all data (no JSON.parse)
- Idempotency INSERT records `event_type`, `payload`, `stripe_customer_id`, `stripe_subscription_id`
- Subscription item extraction: safely reads `sub.items.data[0]` with null checks; normalizes `price.product` to string ID
- Entitlements update uses strict `WHERE business_id = resolvedBusinessId`
- TIER_MAP keyed by `stripe_price_id` (primary), `stripe_product_id` (fallback), with placeholder values
- Deterministic downgrade for non-active statuses: `{ tier: 'starter', is_active: false, profile_cap: 25, is_unlimited: false }`
- Returns 200 for all valid events; only invalid signature returns 400
- Config: `[functions.stripe-webhook] verify_jwt = false`

### Next Step

Update TIER_MAP with actual Stripe price/product IDs after creating products in Stripe.

### Files Changed

1. Migration SQL: billing_customers, billing_subscriptions, billing_events
2. `supabase/functions/stripe-webhook/index.ts`
3. `supabase/config.toml` (auto-managed)
