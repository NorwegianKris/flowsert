
# Fix: Freelancer Gets Redirected Back to Main Page After Login

## Problem
After signing in, the freelancer is sent back to the auth page instead of their worker dashboard. This is a race condition in the authentication flow.

## Root Cause
When a user signs in:
1. The auth context initially loaded with no user, so `loading` was set to `false`
2. When `onAuthStateChange` fires after login, it sets `user` and starts fetching the role -- but does NOT set `loading` back to `true`
3. The Auth page sees `user` is set and `loading` is `false`, so it navigates to `/`
4. `RoleRedirect` also sees `loading=false` and `user` set, but `role` is still `null` (the fetch hasn't completed)
5. Since `role` is null, it falls to the else branch and redirects back to `/auth`

This creates an infinite-feeling loop where the user keeps landing on the auth page.

## Solution

### `src/contexts/AuthContext.tsx`
In the `onAuthStateChange` callback, set `loading = true` before calling `fetchUserData` for a new user. This ensures downstream components wait for the role to be fetched before making routing decisions.

```
// Before (broken):
if (fetchedUserIdRef.current !== session.user.id) {
  fetchUserData(session.user.id);
}

// After (fixed):
if (fetchedUserIdRef.current !== session.user.id) {
  setLoading(true);  // <-- Prevents premature redirect
  fetchUserData(session.user.id);
}
```

This single-line change ensures `RoleRedirect` shows the loading spinner until the role is resolved, then correctly redirects to `/worker` for freelancers.

## What Does NOT Change
- The initial session load flow is unaffected
- Sign-out behavior is unaffected
- The invitation-based registration flow is untouched
- No UI changes needed
