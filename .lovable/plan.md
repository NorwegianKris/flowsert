

## Plan: Fix Invitation Acceptance Flow for Existing Users

### Root Cause

Two issues cause the broken experience:

1. **No auth state listener in InviteAccept**: The `useEffect([token])` checks the session only once on mount. When the user logs in at `/auth` and gets redirected back to `/invite?token=...`, there's a race — `getSession()` may return null momentarily while the auth state propagates. The component never re-checks because `token` hasn't changed.

2. **Competing navigations in Auth.tsx**: Both `handleSignIn` (line 275) and the `useEffect` (line 86-93) try to navigate after login. The useEffect fires because `user` gets set by AuthContext, potentially causing double navigation and flickering.

3. **accept_invite RPC works for existing users** (no DB change needed): It updates `profiles.business_id` and finds the personnel record created by `create-platform-business`. The `user_roles` table already has the user's role (admin), which carries over. The redirect to `/` triggers a full page reload via `window.location.assign`, so AuthContext loads fresh data.

### Fix

#### 1. `src/pages/InviteAccept.tsx` — Add `onAuthStateChange` listener

Add a subscription to `supabase.auth.onAuthStateChange` inside the component. When a `SIGNED_IN` event fires and the component has a valid `preview`, re-evaluate the session state (check email match, set `ready` or `wrong_account`). This eliminates the race condition where the redirect arrives before the session is available.

Also add a `useRef` guard to prevent the initial `useEffect` and the auth listener from competing.

After successful accept, redirect to role-appropriate path (`/admin` for admin invites, `/worker` for worker invites) instead of generic `/`.

#### 2. `src/pages/Auth.tsx` — Remove duplicate navigation

In `handleSignIn` (line 269-279), when a redirect to `/invite` is present, navigate there and `return` early so the `useEffect` at line 86-93 doesn't also navigate. Add a ref flag (`hasNavigatedRef`) set in `handleSignIn` that the `useEffect` checks before navigating.

### Files

| File | Change |
|------|--------|
| `src/pages/InviteAccept.tsx` | Add `onAuthStateChange` listener to re-evaluate on login; role-based redirect after accept |
| `src/pages/Auth.tsx` | Add guard to prevent useEffect from double-navigating after handleSignIn already redirected |

