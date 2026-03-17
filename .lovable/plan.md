

## Plan: AI Cap Pre-check + Billing Portal Fix

### Prompt 3 — AI cap enforcement (client-side pre-check)

The edge function already enforces the OCR cap server-side and returns `monthly_cap_reached`. The client already handles that error in the catch block. However, the user wants a **pre-flight check** before files are queued, plus fail-safe behavior.

**Changes to `src/components/SmartCertificateUpload.tsx`:**

1. Accept `businessId` as a new prop (available from `useAuth()` in the parent).
2. Before processing each file in `processFile`, call `supabase.rpc('check_ai_allowance', { p_business_id: businessId, p_event_type: 'ocr' })`.
3. If the RPC returns `{ allowed: false }`, block the upload and return a result with status `'red'` and an issue message: "You have reached your OCR limit for this plan. Upgrade to continue using Smart Upload."
4. If the RPC call itself fails (network error, etc.), fail safe — block the upload with an error message rather than allowing it through.

**Changes to `src/components/certificate-upload/types.ts`:**
- Add `businessId?: string` to `SmartCertificateUploadProps`.

**Changes to `src/components/AddCertificateDialog.tsx`:**
- Pass `businessId` from `useAuth()` to `SmartCertificateUpload`.

### Prompt 4 — Billing portal fix

**Root cause:** The `create-portal-session` edge function is **not listed** in `supabase/config.toml`. By default, Supabase enforces JWT verification at the gateway level. Since the function does its own auth (Bearer token → `getUser`), it needs `verify_jwt = false` to let the request through.

**Changes:**

1. **`supabase/config.toml`** — Add:
   ```toml
   [functions.create-portal-session]
   verify_jwt = false
   ```

2. **`supabase/functions/create-portal-session/index.ts`** — The `return_url` currently reads from `STRIPE_PORTAL_RETURN_URL` env var. If that secret is empty/unset, `return_url` becomes `undefined`, which Stripe may reject. Add a fallback using `req.headers.get("origin")`:
   ```ts
   const returnUrl = Deno.env.get("STRIPE_PORTAL_RETURN_URL")
     || `${req.headers.get("origin") || 'https://flowsert.lovable.app'}/admin`;
   ```

3. **`src/components/BillingSection.tsx`** — The `handleManageBilling` function already opens the URL in a new tab and shows errors via toast. No changes needed here; the fix is entirely on the config/edge function side.

### Summary

| File | Change |
|------|--------|
| `supabase/config.toml` | Add `create-portal-session` with `verify_jwt = false` |
| `supabase/functions/create-portal-session/index.ts` | Add origin-based fallback for `return_url` |
| `src/components/SmartCertificateUpload.tsx` | Add pre-flight `check_ai_allowance` RPC before each OCR call, fail-safe on error |
| `src/components/certificate-upload/types.ts` | Add `businessId` prop |
| `src/components/AddCertificateDialog.tsx` | Pass `businessId` from auth context |

