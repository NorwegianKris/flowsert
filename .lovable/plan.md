

## Bug Fix: Category Onboarding Modal Shows on Every Login

### Root Cause

Although the caller (`AdminDashboard.tsx` line 509) guards with `profile?.business_id &&`, there is a timing window where `businessId` could arrive as an empty string or change during re-renders. The `useEffect` runs on mount with whatever `businessId` value is present, and if `storageKey` resolves to `flowsert_category_onboarding_dismissed_undefined` or `flowsert_category_onboarding_dismissed_`, the dismissal is written under the wrong key — so it never matches on the next login.

### Fix (single file: `CertificateCategoryOnboarding.tsx`)

1. **Early return before any rendering** — Add `if (!businessId) return null;` at the top of the component body, before the `useState`/`useEffect` hooks execute with a bad key.

2. **Clean up broken localStorage keys on mount** — Inside the `useEffect`, before checking the real key, remove the two known broken keys (`_undefined` and trailing `_`) so existing users who already dismissed with a corrupted key don't see the modal again after this fix.

3. **Move the early-return below hooks** (React rules of hooks) — Since we can't return before hooks, instead guard the `useEffect` body and the JSX return separately:
   - Keep `if (!businessId) return;` in the useEffect (already present)
   - Add `if (!businessId) return null;` after all hooks, before JSX

### Technical Detail

```
// Inside useEffect:
// Clean up broken keys from before the fix
localStorage.removeItem('flowsert_category_onboarding_dismissed_undefined');
localStorage.removeItem('flowsert_category_onboarding_dismissed_');

if (!businessId) return;
if (localStorage.getItem(storageKey)) return;
setOpen(true);

// After hooks, before JSX:
if (!businessId) return null;
```

This is a purely UI-level fix — no database, RLS, or backend changes involved.

