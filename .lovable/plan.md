

## Plan: Fix auth in platform edge functions — use SERVICE_ROLE_KEY for getUser

### Problem
All four platform edge functions use `SUPABASE_ANON_KEY` for the client that calls `auth.getUser(token)`. When the server-side session expires, `getUser` via the anon client fails with 401 even though the JWT is still valid. This is the root cause of the persistent 401 errors on `delete-platform-business` and `update-platform-business`.

### Fix
Change `SUPABASE_ANON_KEY` → `SUPABASE_SERVICE_ROLE_KEY` in the auth verification client for all four functions. The service role client can resolve user identity from a JWT regardless of session state.

| File | Line | Change |
|------|------|--------|
| `supabase/functions/delete-platform-business/index.ts` | 26 | `SUPABASE_ANON_KEY` → `SUPABASE_SERVICE_ROLE_KEY` |
| `supabase/functions/update-platform-business/index.ts` | 36 | `SUPABASE_ANON_KEY` → `SUPABASE_SERVICE_ROLE_KEY` |
| `supabase/functions/list-platform-businesses/index.ts` | 26 | `SUPABASE_ANON_KEY` → `SUPABASE_SERVICE_ROLE_KEY` |
| `supabase/functions/create-platform-business/index.ts` | 51 | `SUPABASE_ANON_KEY` → `SUPABASE_SERVICE_ROLE_KEY` |

Each is a single-line change. The email check (`hello@flowsert.com`) remains the authorization gate. The service role key is only used server-side within edge functions — never exposed to the client.

