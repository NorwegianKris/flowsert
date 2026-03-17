

## Plan: Fix create-platform-business Edge Function

### Root Cause

Two issues found:

1. **Missing config.toml entry**: `create-platform-business` is not registered in `supabase/config.toml`. Every other platform function (`list-platform-businesses`, `update-platform-business`, `delete-platform-business`, `setup-platform-admin`) has `verify_jwt = false`, but `create-platform-business` is missing entirely. This means the deployed version may be stale or using default JWT verification (incompatible with Lovable Cloud's ES256 signing).

2. **Constraint violation in deployed code**: The edge function logs confirm the error:
   ```
   new row for relation "invitations" violates check constraint "invitations_personnel_id_only_when_accepted"
   ```
   The failing rows show a `personnel_id` value being inserted with `status = 'pending'`, violating the check constraint that requires `personnel_id` to be NULL unless status is `'accepted'`. The current code file already omits `personnel_id` from the insert (lines 139-146), but the deployed version appears to be an older copy that still includes it.

### Fix

Add the missing config.toml entry to trigger a proper redeployment of the current (already-fixed) code:

| File | Change |
|------|--------|
| `supabase/config.toml` | Add `[functions.create-platform-business]` with `verify_jwt = false` |

No code changes needed — the `index.ts` file already has the correct insert without `personnel_id`.

