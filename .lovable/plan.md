

## Plan: Fix Entitlements + OCR Allowance UX

### 1. Insert entitlements row for KMU Invest immediately

Use the data insert tool to add Professional tier entitlements for business `c9e4b56d-bcca-4852-930f-7927498694c7`:

```sql
INSERT INTO public.entitlements (business_id, tier, is_active, profile_cap, is_unlimited, monthly_ocr_cap, monthly_chat_cap, monthly_search_cap)
VALUES ('c9e4b56d-bcca-4852-930f-7927498694c7', 'professional', true, 200, false, 500, 999999, 999999);
```

### 2. Fix `create-platform-business` edge function to include AI caps

The edge function already inserts an entitlements row (line 106-113), but it's missing the `monthly_ocr_cap`, `monthly_chat_cap`, and `monthly_search_cap` columns — so they fall back to the column defaults (50, 100, 200) regardless of tier.

**File: `supabase/functions/create-platform-business/index.ts`**

- Add a helper function mapping tier to AI caps (matching the values in `stripe-webhook/index.ts` TIER_MAP)
- Include `monthly_ocr_cap`, `monthly_chat_cap`, `monthly_search_cap` in the entitlements insert

### 3. Add database trigger for safety net

Create a trigger on `businesses` table that auto-inserts a Starter entitlements row on INSERT, using `ON CONFLICT DO NOTHING` so it doesn't overwrite rows already created by the edge function. This ensures no business can ever exist without entitlements.

```sql
CREATE OR REPLACE FUNCTION public.seed_default_entitlements()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.entitlements (business_id, tier, is_active, profile_cap, is_unlimited, monthly_ocr_cap, monthly_chat_cap, monthly_search_cap)
  VALUES (NEW.id, 'starter', true, 25, false, 50, 200, 50)
  ON CONFLICT (business_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_seed_entitlements
AFTER INSERT ON public.businesses
FOR EACH ROW EXECUTE FUNCTION public.seed_default_entitlements();
```

### 4. Show clear toast + reason when OCR cap is blocked

**File: `src/components/SmartCertificateUpload.tsx`** (lines 57-69)

When `allowance.allowed === false`, extract the `reason` field and show a `toast.error()` with a specific message before returning the red result:

- `reason === 'monthly_cap_reached'` → toast: "You've used all X/Y OCR scans this month. Contact your administrator or upgrade your plan."
- `reason === 'no_entitlement_record'` → toast: "Your account is not set up for Smart Upload. Please contact support."
- default → toast: "OCR scanning is unavailable. Please contact support."

This replaces the current silent return with visible user feedback.

