

## Plan: Session Expiry + Document Upload Fix

### 1. Session Expiry Handling — `src/contexts/AuthContext.tsx`

**Problem:** When a token refresh fails and Supabase emits `SIGNED_OUT`, the user stays on authenticated routes with broken API calls.

**Changes:**

- **Detect SIGNED_OUT with prior session:** In the `onAuthStateChange` listener, add a check: if `event === 'SIGNED_OUT'` and `fetchedUserIdRef.current` was set (meaning user was previously logged in), call `window.location.replace('/auth')` after clearing state. This ensures immediate redirect on session expiry.

- **Add periodic session guard:** Set up an `setInterval` (every 60 seconds) inside the same `useEffect` that checks `supabase.auth.getSession()`. If it returns `null` but the component still has a non-null user, trigger `signOut()` and `window.location.replace('/auth')`. Clean up the interval on unmount.

### 2. Document Upload Fix — `src/components/PersonnelDocuments.tsx`

**Problem:** The `document_categories` query (line 203-207) has no `business_id` filter, so it fetches categories from all businesses.

**Fix:** Before querying categories, fetch the personnel record's `business_id`, then filter the `document_categories` query with `.eq('business_id', businessId)`. This can be done by adding a preliminary query for the personnel's business_id at the start of `fetchData()`, or by accepting `businessId` as a prop (which the parent likely has available).

The simpler approach: query the personnel record's `business_id` inline within `fetchData()` since it's already fetching by `personnelId`.

### 3. Storage Policies — No Migration Needed

The `personnel-documents` bucket already has correct RLS policies:
- **SELECT:** `Secure access to personnel documents` — checks admin/manager via business_id match or worker via user_id, using `foldername(name)[1]` as the personnel UUID.
- **INSERT:** `Secure upload to personnel documents` — same pattern for uploads.
- **DELETE:** `Secure delete from personnel documents` — same pattern for deletes.

These policies correctly validate that the first folder segment is the personnel ID and cross-check against the `personnel` table. No migration needed.

### Summary of file changes

| File | Change |
|------|--------|
| `src/contexts/AuthContext.tsx` | Add SIGNED_OUT redirect + 60s session guard interval |
| `src/components/PersonnelDocuments.tsx` | Add business_id filter to document_categories query |

