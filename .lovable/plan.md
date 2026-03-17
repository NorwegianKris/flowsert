

## Plan: Fix Activate/Deactivate Toggle + AI Suggest Types

### Prompt 5 — Activate/Deactivate Personnel

**Root cause identified:** The `ActivateProfileDialog` uses `AlertDialogAction` from Radix UI, which **automatically closes the dialog on click** before the async RPC call completes. This causes a race condition:
- User clicks "Activate" → Radix immediately fires `onOpenChange(false)` → dialog closes → async RPC may still be in flight
- The `onSuccess` callback fires inside the async handler, but by then the dialog state has already been reset
- If the RPC is slow, the UI doesn't reflect the loading state because the dialog has already closed

**Fix in `src/components/ActivateProfileDialog.tsx`:**
- Replace both `AlertDialogAction` buttons with regular `Button` components that don't auto-close the dialog
- The dialog should only close on explicit `onOpenChange(false)` calls after the RPC completes or fails
- This preserves the loading spinner, error handling, and cap-reached states

**Additional fix:** In `ActivationOverview.tsx` line 400, `selectedPerson.activated` is stale after the dialog closes because the component uses the original personnel array. The `onSuccess` → `onRefresh` flow should handle this, but if the refetch is slow, the toggle visually reverts. No code change needed — the `onRefresh` re-fetches correctly.

### Prompt 6 — AI Suggest Types

**Analysis:** The `AISuggestDialog` and `suggest-certificate-types` edge function code both look structurally sound. The dialog has proper batching (25 per call), progress tracking, error handling for 429/402, partial result preservation, and result building.

**Potential issue identified:** The edge function uses `supabase.auth.getClaims(token)` for authentication (line 118-119). The `getClaims` method requires a specific minimum version of `@supabase/supabase-js`. The import `https://esm.sh/@supabase/supabase-js@2` resolves to whatever the latest v2.x is at deploy time — if esm.sh caches an older version, `getClaims` may not exist, causing a silent 401.

**Fix in `supabase/functions/suggest-certificate-types/index.ts`:**
- Replace `getClaims` with `supabase.auth.getUser(token)` which is stable across all v2 versions and achieves the same authentication goal
- This matches the pattern used in other working edge functions (if any use `getUser`)

**Secondary fix:** The edge function logs usage as `personnel_match` event type (line 87) but the allowance check uses `search` event type (line 188). These map to the same `monthly_search_cap` column, so this is consistent — no change needed.

**Redeploy:** After the code change, the edge function must be redeployed.

### Summary

| File | Change |
|------|--------|
| `src/components/ActivateProfileDialog.tsx` | Replace `AlertDialogAction` with `Button` for activate/deactivate actions to prevent premature dialog close |
| `supabase/functions/suggest-certificate-types/index.ts` | Replace `getClaims` with `getUser` for more reliable auth |

