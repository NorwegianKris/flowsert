

# Final Pre-Ship Plan: Invite Flow — Two Last Checks

## Risk: YELLOW (unchanged)
Same scope. Auth redirect and SECURITY DEFINER RPCs. No schema/RLS/migration changes.

## Check 1: `preview_invite` returns rows only for pending + unexpired

The RPC filters `WHERE status='pending' AND expires_at > now()`. If an invite is accepted, expired, or invalid, it returns **zero rows** — not a row with `status='accepted'`. 

In `InviteAccept.tsx`, the "invalid/expired/used" state triggers when `preview_invite` returns no data. There is no need to inspect a `status` field from the response. The implementation will be:

```text
if (!data || (Array.isArray(data) && data.length === 0)) {
  → show "invalid, expired, or already used" message
}
```

No status-checking logic beyond this. Simple and correct.

## Check 2: "Create account" button lands in signup mode

Auth.tsx does **not** read a `mode` query param — it manages `authMode` via internal `useState`. To ensure "Create account" opens signup (not login), we add one small piece of logic to Auth.tsx:

**Auth.tsx init:** Read `mode` from `searchParams` and set initial `authMode`:

```typescript
const modeParam = searchParams.get('mode');
// ... existing state declarations ...
const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'forgot'>(
  modeParam === 'signup' ? 'signup' : 'signin'
);
```

This is additive — won't break existing flows. The invite token flow already forces `signup` mode, so this only matters for the new `/invite` → `/auth` redirect.

**InviteAccept.tsx** builds two distinct CTAs:

| Button | URL |
|--------|-----|
| "Log in to accept" | `/auth?redirect={encoded}` |
| "Create account to accept" | `/auth?mode=signup&redirect={encoded}` |

Both use the same double-encoded redirect. The only difference is the `mode=signup` param.

Also auto-open the auth dialog when `redirect` param is present (user is arriving from `/invite`):

```typescript
// In Auth.tsx useEffect, after existing invite token logic:
const redirectParam = searchParams.get('redirect');
if (redirectParam && !inviteToken && !jobSeekerToken) {
  setAuthDialogOpen(true);
}
```

## Complete File Summary (unchanged from prior plan + these two additions)

| File | Changes |
|------|---------|
| `src/pages/InviteAccept.tsx` | **New.** "Create account" CTA includes `mode=signup`. No status-field inspection — just checks for empty data from `preview_invite`. |
| `src/App.tsx` | Add `/invite` route. |
| `src/pages/Auth.tsx` | (1) Read `mode` param for initial `authMode`. (2) Sanitized `redirect` param. (3) Auto-open dialog when `redirect` present. |
| `src/components/SendProfileInvitationDialog.tsx` | Fix link to `/invite?token=...` + remove `personnel_id` from insert. |
| `src/components/InviteWorkerDialog.tsx` | Fix link to `/invite?token=...`. |
| `src/components/InviteAdminDialog.tsx` | Fix link to `/invite?token=...`. |
| `src/components/AddPersonnelDialog.tsx` | Fix link to `/invite?token=...`. |

## Everything Else Unchanged

All prior requirements carry forward exactly: double-encoded redirects, `window.location.assign()` on sign-out, strict redirect whitelist (`=== '/invite'` or `.startsWith('/invite?')`), console logging, explicit-click-only accept, `INVITE:` error display, no auto-accept.

