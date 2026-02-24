

# Fix CORS Headers in Checkout and Portal Edge Functions

## Problem
The `create-checkout-session` and `create-portal-session` edge functions return HTTP 200 but the browser cannot read the response body because `Access-Control-Allow-Methods` is missing from the CORS headers, and the OPTIONS preflight returns no explicit status code.

## Changes

### 1. `supabase/functions/create-checkout-session/index.ts`

Update `corsHeaders` (lines 4-8) to add `Access-Control-Allow-Methods`:

```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
```

Update OPTIONS handler (line 26) to return explicit `status: 204`:

```typescript
return new Response(null, { status: 204, headers: corsHeaders });
```

### 2. `supabase/functions/create-portal-session/index.ts`

Same two changes:
- Add `"Access-Control-Allow-Methods": "POST, OPTIONS"` to `corsHeaders`
- Update OPTIONS response to `status: 204`

### 3. Deploy both functions

Redeploy `create-checkout-session` and `create-portal-session`.

### 4. Verification

Confirm in DevTools Network tab that the POST response to `create-checkout-session` includes `access-control-allow-origin: *` and the BillingSection successfully redirects to Stripe Checkout.

## Files Changed

| File | Action |
|------|--------|
| `supabase/functions/create-checkout-session/index.ts` | Edit (CORS headers + OPTIONS status) |
| `supabase/functions/create-portal-session/index.ts` | Edit (CORS headers + OPTIONS status) |

## Security Anchors
- Q2 (edge functions): Editing existing edge functions -- CORS-only change, no auth/logic changes
- No schema, RLS, or access control changes

