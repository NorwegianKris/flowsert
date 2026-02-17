

# Fix: Token Refresh Storm Causing Freelancer Login Failure

## Problem
Wayan Lalet cannot stay logged in -- the app enters a redirect loop between `/auth` and `/` that triggers 40+ token refresh requests per second, eventually hitting rate limits (HTTP 429).

## Root Cause
Two issues combine to create this loop:

1. **Unnecessary re-renders on token refresh**: `onAuthStateChange` fires for `TOKEN_REFRESHED` events. Each time, `setSession()` and `setUser()` are called even though the user hasn't changed, causing re-renders across the app.

2. **Auth.tsx redirect triggers the cycle**: The useEffect on line 76 navigates to `/` whenever `user` is set. Each re-render from a token refresh re-evaluates this, and if RoleRedirect briefly sees stale state, it bounces back to `/auth`.

## Solution

### 1. `src/contexts/AuthContext.tsx` -- Filter out redundant state updates

In the `onAuthStateChange` callback, skip `setSession`/`setUser` calls when the user ID hasn't changed. This prevents unnecessary re-renders from `TOKEN_REFRESHED` events:

```typescript
const { data: { subscription } } = supabase.auth.onAuthStateChange(
  (event, session) => {
    if (!isMountedRef.current) return;

    // For token refresh events where user hasn't changed, just update
    // the session reference without triggering re-renders
    if (event === 'TOKEN_REFRESHED' && user?.id === session?.user?.id) {
      setSession(session);
      return;
    }

    setSession(session);
    setUser(session?.user ?? null);

    if (session?.user) {
      if (fetchedUserIdRef.current !== session.user.id) {
        setLoading(true);
        fetchUserData(session.user.id);
      }
    } else {
      fetchedUserIdRef.current = null;
      setProfile(null);
      setRole(null);
      setLoading(false);
    }
  }
);
```

### 2. `src/pages/Auth.tsx` -- Prevent redirect while role is still loading

The redirect on line 76 should also check that `loading` is truly complete (role resolved). Currently it checks `!loading && user`, but if loading finished before role was set (edge case), it redirects prematurely. This is already handled by our previous fix, but we should also guard against re-renders:

```typescript
useEffect(() => {
  if (!loading && user && !isPasswordReset) {
    navigate('/', { replace: true });
  }
}, [user, loading, navigate, isPasswordReset]);
```

Adding `replace: true` prevents the back button from creating another loop.

## What Does NOT Change
- Sign-in/sign-out logic is unaffected
- Invitation-based registration flows are untouched
- The worker dashboard and admin dashboard remain the same
- RoleRedirect logic stays as-is

## Expected Result
After login, Wayan will see a brief loading spinner, then be redirected to `/worker` once her role resolves -- no more loops or rate limiting.

