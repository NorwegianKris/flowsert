

## Plan: Fix Platform Edge Functions and Delete Button

### Root Cause Analysis

You're right — `getClaims` has been the problem across the project. Both `update-platform-business` and `delete-platform-business` already use `getUser(token)`, which is the correct pattern. However, there's a subtle difference from the working `create-platform-business`:

- **Working** (`create-platform-business`): Creates the Supabase client **without** the Authorization header in `global.headers`, then calls `getUser(token)` directly
- **Failing** (`update-platform-business`): Creates the client **with** `{ global: { headers: { Authorization: authHeader } } }` and then also calls `getUser(token)` — this double-auth pattern can cause issues with signing keys

Additionally, `list-platform-businesses` was recently changed to use `getClaims`, which based on this week's pattern of fixes, is likely also broken. It should be reverted to `getUser`.

The edge function logs show zero error-level entries, confirming the 401 is returned silently from the `getUser` failure path.

### Changes

#### 1. `supabase/functions/update-platform-business/index.ts`
- Remove `global.headers` from the anon client construction (match `create-platform-business` pattern)
- Keep `getUser(token)` — it's the stable pattern

#### 2. `supabase/functions/delete-platform-business/index.ts`
- Same auth fix: remove `global.headers` from anon client
- Keep `getUser(token)`
- Remove the `is_test` guard (lines 72-77) so any business can be deleted

#### 3. `supabase/functions/list-platform-businesses/index.ts`
- Revert `getClaims` back to `getUser` to match the working pattern used everywhere else this week

#### 4. `src/components/BusinessDetailSheet.tsx`
- Remove `{localIsTest && (...)}` wrapper (lines 262-277) — delete button always visible
- Update confirmation dialog text from "test business" to just "business"

#### 5. Redeploy all three edge functions

| File | Change |
|------|--------|
| `supabase/functions/update-platform-business/index.ts` | Fix client construction to not pass auth in global headers |
| `supabase/functions/delete-platform-business/index.ts` | Same auth fix + remove `is_test` guard |
| `supabase/functions/list-platform-businesses/index.ts` | Revert `getClaims` → `getUser` |
| `src/components/BusinessDetailSheet.tsx` | Always show delete button, update dialog copy |

