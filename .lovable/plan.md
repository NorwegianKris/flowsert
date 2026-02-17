

# Fix: Broaden Auth Event Guard + Clear Wayan's Session

## Problem
The freelancer's page "keeps loading forever." Two issues are at play:

1. **Stale browser state**: Wayan's browser has corrupted/revoked tokens cached from previous login attempts, causing a cascade of token refresh calls the moment she opens the site.

2. **Narrow event guard**: The current fix only filters `TOKEN_REFRESHED` events, but `SIGNED_IN` events also fire repeatedly during the token storm. Each one calls `setUser()`, causing unnecessary re-renders that feed the redirect loop.

## Solution

### 1. `src/contexts/AuthContext.tsx` -- Guard ALL events for the same user

Change the guard from only `TOKEN_REFRESHED` to any event where the user ID hasn't changed (except `SIGNED_OUT`). This eliminates all unnecessary re-renders during a storm:

```typescript
// Before (too narrow):
if (event === 'TOKEN_REFRESHED' && fetchedUserIdRef.current === session?.user?.id) {
  setSession(session);
  return;
}

// After (covers all events):
if (event !== 'SIGNED_OUT' && fetchedUserIdRef.current === session?.user?.id) {
  setSession(session);
  return;
}
```

This means once a user's profile and role have been fetched, no auth event can trigger a `setUser()` re-render unless the actual user changes or signs out.

### 2. Tell Wayan to clear her browser data

After publishing, ask Wayan to:
- Clear cookies and site data for flowsert.com (or use an incognito/private window)
- Then log in again

This removes the corrupted tokens that are fueling the current storm.

## What Does NOT Change
- Sign-in / sign-out logic is unaffected
- Initial session loading is unaffected
- Role fetching and redirect logic stay the same
- Invitation-based registration flows are untouched

## Expected Result
After clearing browser data, Wayan logs in once, gets a clean session, and is redirected to her worker dashboard. The broadened guard prevents any future token storms from causing re-render cascades.

