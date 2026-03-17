

## Plan: Create Business Form + Edge Function

### 1. New Edge Function: `supabase/functions/create-platform-business/index.ts`

Same auth pattern as `create-portal-session` — uses `supabase.auth.getUser(token)` (not `getClaims`):

- Authenticates via `getUser(token)`, checks email is `hello@flowsert.com`
- Reads `name`, `tier`, `is_test`, `admin_name`, `admin_email` from request body
- Uses service role client to:
  1. INSERT `businesses` — `name`, `is_test`, `company_code` (random 6-char uppercase alphanumeric)
  2. INSERT `entitlements` — `business_id`, `tier`, `profile_cap` from `get_tier_profile_limit()` logic (starter=25, growth=75, professional=200), `is_active = true`
  3. INSERT `personnel` — admin record with `activated = false`
  4. INSERT `invitations` — `business_id`, `email`, `role = 'admin'`, `status = 'pending'`, `token = crypto.randomUUID()`, `expires_at = now + 7 days`, `personnel_id`
- Returns `{ business_id, invitation_url }` where URL is `https://flowsert.lovable.app/invite?token={token}`

### 2. Config: `supabase/config.toml`

Add `[functions.create-platform-business]` with `verify_jwt = false`.

### 3. New Component: `src/components/CreateBusinessDialog.tsx`

Dialog with form fields:
- Business name (required, text)
- Admin full name (required, text)
- Admin email (required, email)
- Plan tier (Select: Starter/Growth/Professional mapping to starter/growth/professional)
- Mark as test (Switch, default off)

Two states:
- **Form view**: submit calls edge function with session token
- **Success view**: shows invitation URL in a read-only input with copy button; dialog stays open; `onCreated()` callback fires to refresh list

### 4. Updated: `src/pages/PlatformDashboard.tsx`

- Extract `fetchBusinesses` out of `useEffect` so it can be called on demand
- Import and render `CreateBusinessDialog`, passing `onCreated={fetchBusinesses}`
- Replace the placeholder toast button with dialog trigger

### Files

| File | Change |
|------|--------|
| `supabase/functions/create-platform-business/index.ts` | New edge function |
| `supabase/config.toml` | Register function |
| `src/components/CreateBusinessDialog.tsx` | New dialog component |
| `src/pages/PlatformDashboard.tsx` | Wire up dialog + refetch |

