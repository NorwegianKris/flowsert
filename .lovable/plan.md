

# Billing Flow: Checkout, Portal, and BillingSection

## Summary
Create two edge functions (`create-checkout-session`, `create-portal-session`) and a new `BillingSection` component wired into the Admin Settings panel. The UI will show subscription status from `billing_subscriptions` (not just entitlements) and allow subscribing or managing billing.

---

## 1. New File: `src/lib/stripePrices.ts`

Centralized price ID constants matching the webhook's `TIER_MAP`:

```text
PRICE_MAP = {
  starter_monthly:      "price_1T4Q47CTZs6lfaVYaVf2mLWJ"  -> cap 25
  starter_annual:       "price_1T4Q5FCTZs6lfaVYJcUidzzL"  -> cap 25
  growth_monthly:       "price_1T4Q5nCTZs6lfaVYNr3gobm3"  -> cap 75
  growth_annual:        "price_1T4Q6HCTZs6lfaVYoReiRSXM"  -> cap 75
  professional_monthly: "price_1T4Q6iCTZs6lfaVYZEZNA1yo"  -> cap 200
  professional_annual:  "price_1T4Q78CTZs6lfaVYkfdJW4eq"  -> cap 200
}
```

Also exports an `ALLOWED_PRICE_IDS` set for server-side validation.

---

## 2. New Edge Function: `create-checkout-session`

**File:** `supabase/functions/create-checkout-session/index.ts`

- CORS + OPTIONS handling
- Extract JWT from Authorization header, validate via `supabase.auth.getUser(token)`
- Verify caller has admin role via service-role query on `user_roles`
- Resolve `business_id` from `profiles`
- **Server-side allowlist**: reject `price_id` not in `ALLOWED_PRICE_IDS` with 400
- Look up existing Stripe customer in `billing_customers`:
  - If found: retrieve Stripe customer, **ensure `metadata.business_id` is set** (update customer if missing)
  - If not found: create new Stripe customer with `metadata.business_id`, upsert `billing_customers`
- Create Stripe Checkout Session:
  - `mode: "subscription"`
  - `line_items: [{ price: price_id, quantity: 1 }]`
  - `subscription_data.trial_period_days: 14`
  - `subscription_data.metadata: { business_id }`
  - `client_reference_id: business_id`
  - `metadata: { business_id }`
  - `success_url` / `cancel_url` from env
- Return `{ url: session.url }`

**Config:** Add `[functions.create-checkout-session]` with `verify_jwt = false` to `supabase/config.toml`

---

## 3. New Edge Function: `create-portal-session`

**File:** `supabase/functions/create-portal-session/index.ts`

- CORS + OPTIONS handling
- JWT + admin role verification (same pattern as above)
- Resolve `business_id` from profile
- Look up `stripe_customer_id` from `billing_customers`
- If no customer found, return 404 error
- Create Stripe Billing Portal session with `return_url` from env `STRIPE_PORTAL_RETURN_URL`
- Return `{ url: portalSession.url }`

**Config:** Add `[functions.create-portal-session]` with `verify_jwt = false`

---

## 4. New Component: `src/components/BillingSection.tsx`

A Collapsible section inserted in Admin Settings (after "Profile Activation and Tier Overview", before `CategoriesSection`).

**Data sources:**
- Entitlement: fetched via `getBusinessEntitlement(businessId)`
- Subscription: fetched from `billing_subscriptions` table filtered by `business_id`
- Active profile count: count of `personnel` with `activated = true`

**Display:**
- Current tier + subscription status badge (`active`, `trialing`, `canceled`, or `No subscription`)
- If trialing: shows trial end date
- Current period end date
- Active profiles: `X / cap` with progress bar
- Cancel at period end warning if applicable

**Actions:**
- **Subscribe buttons** (3 tiers, monthly/annual toggle) -- only shown when no active/trialing subscription
  - Each calls `create-checkout-session` with the corresponding `price_id`, then `window.location.href = url`
- **"Manage Billing" button** -- only shown when subscription exists
  - Calls `create-portal-session`, opens portal URL in new tab

---

## 5. Wire into AdminDashboard

**Edit:** `src/pages/AdminDashboard.tsx`
- Import `BillingSection`
- Add `<BillingSection businessId={profile?.business_id} />` in the settings panel between the "Profile Activation" collapsible and `CategoriesSection` (~line 718)

---

## 6. Post-Deploy Verification Queries

After implementation and deploy, these exact SQL queries will be provided for end-to-end verification:

```sql
-- 1. billing_customers: Stripe customer linked to business
SELECT * FROM billing_customers WHERE business_id = '<your_business_id>';

-- 2. billing_events: checkout + subscription events logged
SELECT id, event_type, stripe_customer_id, business_id, created_at
FROM billing_events ORDER BY created_at DESC LIMIT 10;

-- 3. billing_subscriptions: status, price, trial
SELECT business_id, status, stripe_price_id, trial_end, current_period_end, cancel_at_period_end
FROM billing_subscriptions WHERE business_id = '<your_business_id>';

-- 4. entitlements: tier + cap synced by webhook
SELECT * FROM entitlements WHERE business_id = '<your_business_id>';
```

---

## Files Changed

| File | Action |
|------|--------|
| `src/lib/stripePrices.ts` | Create |
| `supabase/functions/create-checkout-session/index.ts` | Create |
| `supabase/functions/create-portal-session/index.ts` | Create |
| `src/components/BillingSection.tsx` | Create |
| `src/pages/AdminDashboard.tsx` | Edit (add BillingSection import + usage) |
| `supabase/config.toml` | Edit (add 2 function configs) |

## Security Anchors

- **Q1 (SQL)**: No schema changes -- existing tables used as-is
- **Q2 (edge functions/auth)**: Two new edge functions with manual JWT + admin role verification using service-role key server-side
- **Q3 (access control)**: Price allowlist prevents arbitrary price injection; `business_id` metadata ensures webhook resolution
- All secrets (`STRIPE_SECRET_KEY`, `STRIPE_SUCCESS_URL`, `STRIPE_CANCEL_URL`, `STRIPE_PORTAL_RETURN_URL`) already configured

