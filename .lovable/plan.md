

## Implementation: Billing Tables Migration + stripe-webhook Edge Function

**Risk: RED** -- New billing tables with RLS + public webhook writing billing/entitlement data.

---

### Step 1: Database Migration

Create three tables (`billing_customers`, `billing_subscriptions`, `billing_events`) with:

- Full RLS: admin SELECT-only scoped to business_id, REVOKE INSERT/UPDATE/DELETE from authenticated
- `billing_subscriptions.stripe_subscription_id` is NOT NULL
- `trial_end` column on billing_subscriptions
- `updated_at` trigger using existing `update_updated_at_column()`
- Idempotency via `billing_events.stripe_event_id` UNIQUE
- NULL `business_id` rows in billing_events stay server-only
- Indexes on billing_events(business_id) and billing_events(stripe_subscription_id)

### Step 2: stripe-webhook Edge Function

**New file:** `supabase/functions/stripe-webhook/index.ts`

Processing order:
1. Check `stripe-signature` header -- return 400 if missing
2. `await req.text()` for raw body
3. `stripe.webhooks.constructEvent(rawBody, sig, secret)` -- return 400 on invalid signature
4. Use `event.data.object` for all data (no JSON.parse)
5. Idempotency: INSERT `billing_events` with `stripe_event_id`, `event_type`, `payload`, `stripe_customer_id`, `stripe_subscription_id` -- if conflict, return 200
6. Resolve `business_id`: check `billing_customers` by `stripe_customer_id`, fallback to Stripe Customer `metadata.business_id`, upsert `billing_customers`
7. If unresolved: UPDATE `billing_events` SET `resolution_failed = true`, return 200
8. Event handling per type
9. Return 200 for all valid events

**Specific implementation details per user requirements:**

- `stripe-signature` header read and validated; 400 on missing/invalid
- Idempotency INSERT records `event_type`, `payload`, `stripe_customer_id`, `stripe_subscription_id`
- Subscription item extraction: safely reads `sub.items.data[0]` with null checks; normalizes `price.product` to string ID
- Entitlements update uses strict `WHERE business_id = resolvedBusinessId`
- TIER_MAP keyed by `stripe_price_id` (primary), `stripe_product_id` (fallback), with placeholder values
- Deterministic downgrade for non-active statuses: `{ tier: 'starter', is_active: false, profile_cap: 25, is_unlimited: false }`
- For `customer.subscription.deleted`: persists status, current_period_end, cancel_at_period_end from event.data.object

**Config:** `[functions.stripe-webhook] verify_jwt = false` added to config.toml (auto-managed).

No CORS headers (Stripe server-to-server). Service-role Supabase client for all DB writes.

### Files Changed

1. New migration SQL (billing_customers, billing_subscriptions, billing_events)
2. New: `supabase/functions/stripe-webhook/index.ts`
3. Auto-updated: `supabase/config.toml`

### What does NOT change

- entitlements table structure
- No frontend changes
- No other edge functions

