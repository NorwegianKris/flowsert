

## Update TIER_MAP in stripe-webhook with Stripe Price IDs

**Risk: RED** -- Modifying the webhook's subscription-to-entitlement mapping logic.

---

### What changes

**File:** `supabase/functions/stripe-webhook/index.ts`

Replace the commented-out placeholder `TIER_MAP` with the actual Stripe price IDs:

```text
const TIER_MAP = {
  // Starter
  "price_1T4Q47CTZs6lfaVYaVf2mLWJ": { tier: "starter",       profile_cap: 25,  is_unlimited: false }, // Monthly
  "price_1T4Q5FCTZs6lfaVYJcUidzzL": { tier: "starter",       profile_cap: 25,  is_unlimited: false }, // Annual
  // Growth
  "price_1T4Q5nCTZs6lfaVYNr3gobm3": { tier: "growth",        profile_cap: 75,  is_unlimited: false }, // Monthly
  "price_1T4Q6HCTZs6lfaVYoReiRSXM": { tier: "growth",        profile_cap: 75,  is_unlimited: false }, // Annual
  // Professional
  "price_1T4Q6iCTZs6lfaVYZEZNA1yo": { tier: "professional",  profile_cap: 200, is_unlimited: false }, // Monthly
  "price_1T4Q78CTZs6lfaVYkfdJW4eq": { tier: "professional",  profile_cap: 200, is_unlimited: false }, // Annual
};
```

No product ID fallbacks needed since all 6 price IDs are provided. The commented-out product ID lines will be removed.

### What does NOT change

- Processing order, signature verification, idempotency, entitlement sync logic
- Deterministic downgrade behavior for non-active statuses
- No database changes
- No frontend changes

### After deploy -- verification steps

1. In Stripe Dashboard (Test mode), go to **Developers > Webhooks > Send test webhook**
2. Select event type `customer.subscription.updated`
3. Check your database:
   - `billing_events`: new row with the test event's `stripe_event_id`
   - If `resolution_failed = true`, that's expected for a synthetic test event (no real customer/business mapping)
4. For a real end-to-end test: complete a Stripe Checkout flow, then verify:
   - `billing_customers`: row linking your `business_id` to `stripe_customer_id`
   - `billing_subscriptions`: row with correct `stripe_price_id` and `status = 'active'`
   - `entitlements`: `is_active = true`, correct `tier` and `profile_cap` matching the price

