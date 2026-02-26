

# Plan: Route Invite CTAs Through `/` + Auth Modal (Not `/auth`)

## Risk: YELLOW
Auth flow routing. No schema/RLS/migration changes.

## Problem
`/auth` is intercepted by the Lovable platform. InviteAccept.tsx currently builds CTA URLs pointing to `/auth?redirect=...` (lines 106-107). Must route through `/?auth=1&...` instead.

## Changes

### 1. `src/pages/InviteAccept.tsx` — Change CTA URLs (lines 106-107)

Replace:
```typescript
const loginUrl = `/auth?redirect=${encodeURIComponent(redirectUrl)}`;
const signupUrl = `/auth?mode=signup&redirect=${encodeURIComponent(redirectUrl)}`;
```
With:
```typescript
const loginUrl = `/?auth=1&mode=signin&redirect=${encodeURIComponent(redirectUrl)}`;
const signupUrl = `/?auth=1&mode=signup&redirect=${encodeURIComponent(redirectUrl)}`;
```

No other changes to this file.

### 2. `src/pages/RoleRedirect.tsx` — Render `<Auth />` when `!user && auth=1`

Current behavior: always navigates to `/auth` when not logged in. New behavior: if `auth=1` param present, render `<Auth />` inline instead.

```typescript
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { needsConsent } from '@/lib/legalVersions';
import { Loader2 } from 'lucide-react';
import Auth from './Auth';

export default function RoleRedirect() {
  const { user, role, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const authRequested = searchParams.get('auth') === '1';

  useEffect(() => {
    if (loading) return;

    if (!user) {
      if (authRequested) return; // Don't navigate, render Auth below
      navigate('/auth', { replace: true });
      return;
    }

    // ... existing consent + role redirect logic unchanged ...
  }, [user, role, profile, loading, navigate, authRequested]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!loading && !user && authRequested) {
    return <Auth />;
  }

  // Default spinner (brief flash while useEffect navigates)
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
```

Key guardrails:
- `<Auth />` only renders when **both** `!user` and `auth=1` — all other logged-out visits navigate to `/auth` as before
- `!loading` guard prevents infinite spinner
- Auth component already reads `mode` and `redirect` from searchParams, auto-opens dialog, and navigates to `safeRedirect` after auth (defaulting to `/` when redirect is missing)

### 3. `src/pages/Auth.tsx` — No changes needed

Already handles all required behavior:
- Line 55-58: Reads `mode` param for initial `authMode`
- Line 85-93: On user login, navigates to `safeRedirect` (defaults to `/` when no redirect)
- Line 102-108: Auto-opens dialog when `redirect` param present
- Line 269-276: After sign-in, navigates to `safeRedirect`

The `/?auth=1&mode=signin` (no redirect) case works correctly: Auth opens, user logs in, `safeRedirect` defaults to `/`, user lands on home. The `auth=1` and `mode` params are consumed and not persisted because `navigate('/', { replace: true })` replaces the URL.

## Acceptance Tests (browser automation)

| Test | URL | Expected |
|------|-----|----------|
| (a) Normal logged-out `/` | `/` | Redirects to `/auth` (existing behavior) |
| (b) `/?auth=1&mode=signin` | `/?auth=1&mode=signin` | FlowSert auth UI opens in signin mode |
| (c) Wrong account gate | `/invite?token=...` while logged in as wrong user | Blocking "Wrong Account" screen |
| (d) Incognito accept | `/invite?token=...` → click "Create account" | Goes to `/?auth=1&mode=signup&redirect=...` → FlowSert signup UI |
| (e) No redirect param | `/?auth=1&mode=signin` → login | Lands on `/` (safeRedirect defaults to `/`) |

