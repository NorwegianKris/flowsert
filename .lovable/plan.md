

# Fix BillingSection: Replace supabase.functions.invoke with direct fetch

## Problem
`supabase.functions.invoke()` is returning an opaque response that prevents reading JSON. The UI spinner never resolves.

## Solution
Replace `supabase.functions.invoke` calls in both `handleSubscribe` and `handleManageBilling` with direct `fetch()` using the default CORS mode, explicit Authorization header, and proper JSON parsing with error handling.

## Changes

### File: `src/components/BillingSection.tsx`

**handleSubscribe** (lines 66-87): Replace `supabase.functions.invoke` with:

```typescript
const handleSubscribe = async (tier: TierKey) => {
  const priceId = getPriceId(tier, interval);
  setLoadingPrice(priceId);
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) { toast.error('Please sign in first'); return; }

    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout-session`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ price_id: priceId }),
      }
    );

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Checkout failed');
    if (!data.url) throw new Error('No checkout URL returned');
    window.location.href = data.url;
  } catch (err: any) {
    toast.error(err.message || 'Failed to start checkout');
  } finally {
    setLoadingPrice(null);
  }
};
```

**handleManageBilling** (lines 89-101): Same pattern:

```typescript
const handleManageBilling = async () => {
  setPortalLoading(true);
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) { toast.error('Please sign in first'); return; }

    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-portal-session`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      }
    );

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Portal failed');
    if (!data.url) throw new Error('No portal URL returned');
    window.open(data.url, '_blank');
  } catch (err: any) {
    toast.error(err.message || 'Failed to open billing portal');
  } finally {
    setPortalLoading(false);
  }
};
```

## Key improvements
- Default fetch mode (no opaque response)
- Explicit JSON parsing with `res.json()`
- Error checking via `res.ok` before using data
- `finally` block clears loading state in all cases
- Error toast shown for any failure

## Files Changed

| File | Action |
|------|--------|
| `src/components/BillingSection.tsx` | Edit (replace invoke calls with direct fetch) |

## Security Anchors
- Q5 (UI only): Yes -- purely frontend fetch logic change, no auth/schema/RLS changes
