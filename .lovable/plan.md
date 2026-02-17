
# Fix: Make "Log In" Button Open the Sign-In Dialog

## Problem
The "Log In" button in the header navigates to `/auth`, but the login form lives inside a dialog that never opens. Previously, the `PublicHeader` had an `openAuthDialog` prop that triggered the dialog -- this was removed in the last change.

## Solution
Re-add a lightweight callback prop to `PublicHeader` for opening the auth dialog, but only for sign-in (no sign-up).

### Changes

### 1. `src/components/PublicHeader.tsx`
- Add an optional `onLogin` callback prop
- When `onLogin` is provided, use it instead of navigating to `/auth`

### 2. `src/pages/Auth.tsx`
- Pass `onLogin` to `PublicHeader` that opens the auth dialog in "signin" mode
- This restores the login functionality without re-introducing any signup button

## Technical Details

**PublicHeader.tsx:**
```typescript
interface PublicHeaderProps {
  onLogin?: () => void;
}

export function PublicHeader({ onLogin }: PublicHeaderProps) {
  const navigate = useNavigate();

  const handleLogin = () => {
    if (onLogin) {
      onLogin();
    } else {
      navigate('/auth');
    }
  };
  // ... rest unchanged
}
```

**Auth.tsx:**
```typescript
<PublicHeader onLogin={() => openAuthDialog('signin')} />
```

## What Does NOT Change
- No "Sign Up" button is added anywhere
- The invitation-based registration flow is untouched
- Other pages using `PublicHeader` without the prop still navigate to `/auth` as before
