

## Plan: One-time Platform Admin Bootstrap

### Approach
Create an edge function `setup-platform-admin` that creates the auth user, plus a temporary frontend route `/setup-platform-admin` that calls it. The edge function is idempotent — it checks if the user exists first.

### 1. Secret: PLATFORM_ADMIN_PASSWORD
Use the `add_secret` tool to request the password from the user. This is a runtime secret available to edge functions.

### 2. Edge Function: `supabase/functions/setup-platform-admin/index.ts`
- Uses service role key to call `supabase.auth.admin.listUsers()` filtered by email
- If user exists: returns `{ already_exists: true }`
- If not: calls `supabase.auth.admin.createUser({ email, password, email_confirm: true })`
- Password read from `Deno.env.get('PLATFORM_ADMIN_PASSWORD')`
- Standard CORS headers
- No JWT verification needed (the route itself is gated client-side, and the function is idempotent + harmless after first run)

### 3. Config: `supabase/config.toml`
Add `[functions.setup-platform-admin]` with `verify_jwt = false`

### 4. Frontend Route: `src/pages/SetupPlatformAdmin.tsx`
- On mount: calls the edge function
- If `already_exists`: shows message + redirects to `/auth` after 2 seconds
- If created: shows success message + redirect to `/auth`
- If error: shows error
- Minimal standalone page, FlowSert branding

### 5. App.tsx
Add route: `<Route path="/setup-platform-admin" element={<SetupPlatformAdmin />} />`

### Files

| File | Change |
|------|--------|
| Secret | Add `PLATFORM_ADMIN_PASSWORD` |
| `supabase/functions/setup-platform-admin/index.ts` | New edge function |
| `supabase/config.toml` | Add function config |
| `src/pages/SetupPlatformAdmin.tsx` | New one-time setup page |
| `src/App.tsx` | Add `/setup-platform-admin` route |

