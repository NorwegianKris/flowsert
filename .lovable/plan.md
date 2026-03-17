
Goal: instrument `delete-platform-business` so we can see exactly what the deployed function receives, prove whether the latest code is running, and confirm whether the service-role secret is available in that function runtime.

What I verified first:
- `delete-platform-business` already has `verify_jwt = false` in `supabase/config.toml`, so that is not the missing piece.
- Its auth flow already matches `create-platform-business` in all material steps:
  - read `Authorization` header
  - require `Bearer ...`
  - extract token with `replace("Bearer ", "")`
  - create client with `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`
  - call `auth.getUser(token)`
  - check `user.email === "hello@flowsert.com"`
- Current function logs only show boot events, not request-level diagnostics, so we cannot yet tell whether the deployed handler is the newest version or whether env lookup is failing.

Implementation plan:
1. Add request-entry logging at the very top of `delete-platform-business/index.ts`
   - Log a unique redeploy marker/version string
   - Log the exact `Authorization` header value received
   - Log booleans for `hasSupabaseUrl` and `hasServiceRoleKey`
   - Log header length as an extra sanity check

2. Add `getUser()` result logging immediately after the auth call
   - Log `userError?.message`
   - Log `userError?.status`
   - Log whether a user object was returned
   - Log resolved `user.id` and `user.email` when present

3. Force a full redeploy
   - Make a trivial no-op change/comment plus the unique boot/version log
   - Redeploy `delete-platform-business`
   - The new marker in logs will confirm the deployed code actually updated

4. Re-test the delete action and inspect logs
   - If `Authorization` is missing or malformed: client invocation issue
   - If `hasServiceRoleKey` is `false`: runtime secret/env problem
   - If `getUser` logs `Session not found`: auth/session validation path is still the failing point
   - If `user.email` resolves correctly but request still fails later: the problem is in delete logic, not auth

Important detail about the secret check:
- `fetch_secrets` does not currently list `SUPABASE_SERVICE_ROLE_KEY`, but the backend configuration context says it exists as a platform-provided runtime secret.
- Because of that mismatch, the safest confirmation is to log `Boolean(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"))` from inside the function itself rather than relying on the secrets list.

Files involved:
- `supabase/functions/delete-platform-business/index.ts`
- `supabase/config.toml` only for verification reference; no config change planned unless logs prove a separate issue

Expected outcome:
- We will know whether the function is receiving the bearer token, whether the service-role key is available at runtime, whether `getUser()` is failing with `session_not_found` or something else, and whether a stale deployment is the real cause.