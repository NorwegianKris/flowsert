

# Fix: Clear Stale Tokens Before Login to Stop Token Refresh Storm

## Problem
Wayan logs in successfully, briefly sees her dashboard, then gets bounced back to the login page. Auth logs show 40+ token refresh/revoke calls per second immediately after login.

## Root Cause
The broadened event guard prevents unnecessary React re-renders, but it does NOT stop the Supabase SDK's internal `autoRefreshToken` mechanism. Here is what happens:

1. Wayan's browser has old/corrupted tokens cached in localStorage from previous sessions
2. She logs in with her password (succeeds, returns fresh tokens)
3. The SDK's auto-refresh detects the old cached tokens and tries to refresh them in parallel
4. Each successful refresh **revokes** the previous token, which triggers more refreshes
5. This creates an infinite HTTP-level storm that overwhelms the rate limit (429 errors)
6. The app cannot complete any data fetches (profile, role) and the loading state never resolves, causing the redirect back to `/auth`

## Solution

### 1. `src/pages/Auth.tsx` -- Clear stale tokens before signing in

Before calling `signIn`, do a local-only sign-out to wipe any corrupted cached tokens from localStorage:

```typescript
const handleSignIn = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!validateForm()) return;

  setIsLoading(true);

  // Clear any stale/corrupted tokens before signing in
  // This prevents the token refresh storm
  await supabase.auth.signOut({ scope: 'local' });

  const { error } = await signIn(email, password);
  setIsLoading(false);
  // ... rest stays the same
};
```

This single line (`signOut({ scope: 'local' })`) clears the browser's cached session without hitting the server, so when the fresh login completes, there are no old tokens left to trigger competing refreshes.

### 2. `src/contexts/AuthContext.tsx` -- Already fixed (no changes needed)

The broadened guard (`event !== 'SIGNED_OUT'`) remains in place as a safety net against any residual re-render issues.

## Technical Details
- `signOut({ scope: 'local' })` only clears `localStorage` -- it does NOT revoke the server-side session
- This is safe because the old tokens are already corrupted/revoked anyway
- The fresh `signInWithPassword` call immediately creates a clean new session
- No changes needed to the worker dashboard, role redirect, or any other component

## What Does NOT Change
- Sign-up flows (invitation, freelancer) are unaffected
- Password reset flow is unaffected
- Admin login is unaffected (but also benefits from this safety measure)
- All existing auth guards and RLS policies remain intact

## Expected Result
Wayan opens flowsert.com, enters her credentials, presses Sign In. The stale tokens are cleared, a fresh session is created, and she is redirected to her worker dashboard without any storm or redirect loop.

