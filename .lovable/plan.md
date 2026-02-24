

## Implement Legal Pages, Footer, and Version-Aware Consent Flow

**Risk: AMBER** -- Modifies signup flow (consent checkbox + versioned acceptance), adds database columns, adds consent guard with version enforcement. No destructive changes.

---

### Critical Invariants (Non-Negotiable)

These five rules must hold. Violating any one is a shipping blocker.

1. **Consent redirect fires only after `loading === false`.** Guard order in both `ProtectedRoute` and `RoleRedirect` is exactly: loading spinner, then no-user redirect, then `needsConsent()` redirect, then role checks, then render children. No reordering.

2. **`/consent` is NOT wrapped by `ProtectedRoute`.** It is a standalone route in `App.tsx` (like `/auth`). The `Consent.tsx` component checks `user` internally via `useAuth()`. This prevents infinite redirect loops.

3. **Guard order: loading, no user, needsConsent, role checks.** In `ProtectedRoute.tsx`:
   ```text
   if (loading) return <Spinner />
   if (!user) return <Navigate to="/auth" />
   if (needsConsent(profile)) return <Navigate to="/consent" />
   // ...existing role checks...
   return children
   ```
   In `RoleRedirect.tsx` useEffect:
   ```text
   if (loading) return
   if (!user) { navigate('/auth'); return }
   if (needsConsent(profile)) { navigate('/consent'); return }
   // ...existing role routing...
   ```

4. **After consent success, profile state in AuthContext is refreshed.** A new `refreshProfile()` function is added to `AuthContext` that re-fetches the profile row for the current user and updates `profile` state. `Consent.tsx` calls this after a successful database update so the guard passes immediately -- no page reload needed.

5. **If the profile update fails on `/consent`, the user can retry.** The "Continue" button re-enables on failure. An error toast is shown with the failure reason. The user is NOT redirected, NOT trapped, and NOT silently ignored.

---

### Defensive Edge Case: Missing Profile

The `handle_new_user` trigger is atomic -- it raises an exception (rolling back the `auth.users` insert) if the profile cannot be created. Under normal operation, `profile` is never `null` when `user` is present.

However, if `profile` is `null` after loading completes:
- `needsConsent(null)` returns `true`, redirecting to `/consent`
- `/consent` detects `!profile` and shows: "Your account setup is incomplete. Please sign out and contact support." with a Sign Out button
- No attempt to UPDATE a non-existent row

---

### Phase 1: Database Migration

Add three nullable columns to the `profiles` table:

```text
terms_accepted_at    TIMESTAMPTZ    nullable    default null
terms_version        TEXT           nullable    default null
privacy_version      TEXT           nullable    default null
```

Classification: GREEN (additive columns, no destructive changes). No RLS changes needed -- existing policies allow users to update their own profile row.

---

### Phase 2: AuthContext Changes

**File: `src/contexts/AuthContext.tsx`**

- Extend the `Profile` interface with three new fields: `terms_accepted_at`, `terms_version`, `privacy_version` (all `string | null`)
- The existing `fetchUserData` already does `select('*')`, so new columns populate automatically
- Add `refreshProfile()` to `AuthContextType` -- re-runs the profile fetch for the current user and updates state
- Reset `fetchedUserIdRef` before re-fetching so the dedup guard allows it
- Expose `refreshProfile` via the context value

---

### Phase 3: Version Constants and Helper

**New file: `src/lib/legalVersions.ts`**

```text
export const TERMS_VERSION = "1.0";
export const PRIVACY_VERSION = "1.0";

export function needsConsent(profile: {
  terms_accepted_at: string | null;
  terms_version: string | null;
  privacy_version: string | null;
} | null): boolean {
  if (!profile) return true;
  if (!profile.terms_accepted_at) return true;
  if (profile.terms_version !== TERMS_VERSION) return true;
  if (profile.privacy_version !== PRIVACY_VERSION) return true;
  return false;
}
```

---

### Phase 4: Consent Guard

**File: `src/components/ProtectedRoute.tsx`**

Add `needsConsent(profile)` check after `!user` check and before role checks. Import `profile` from `useAuth()`. Import `needsConsent` from `legalVersions`.

**File: `src/pages/RoleRedirect.tsx`**

Same pattern in the `useEffect`: after `!user` check, before role-based `navigate()`. Add `profile` to destructuring and dependency array.

---

### Phase 5: Consent Page

**New file: `src/pages/Consent.tsx`** at route `/consent`

Guard order inside the component:
1. `if (loading)` -- spinner
2. `if (!user)` -- redirect to `/auth`
3. `if (!profile)` -- show error: "Your account setup is incomplete. Please sign out and contact support." with Sign Out button
4. `if (!needsConsent(profile))` -- redirect to `/` (already accepted)
5. Otherwise -- show consent form

Consent form:
- FlowSert branding (PublicHeader)
- Heading: "Before you continue"
- Subtext explaining terms may have been updated
- Checkbox: "I agree to the Terms of Service and Privacy Policy" (links to `/terms` and `/privacy`, same tab)
- "Continue" button, disabled until checked
- On click: update profile with `terms_accepted_at`, `terms_version`, `privacy_version`
- On success: call `refreshProfile()`, then `navigate('/', { replace: true })`
- On failure: show error toast, re-enable button

---

### Phase 6: Signup Consent Checkbox

**File: `src/pages/Auth.tsx`**

In the signup form, between the password field and the "Create Account" button:
- `termsAccepted` boolean state (default `false`)
- Checkbox: "I agree to the Terms of Service and Privacy Policy" (links same tab)
- "Create Account" button disabled when unchecked
- After successful signup, update profile with versioned consent
- Reset `termsAccepted` when switching auth modes

---

### Phase 7: Legal Page Components (Static JSX)

Each HTML document converted into React JSX -- no `dangerouslySetInnerHTML`.

| New File | Route | Source |
|----------|-------|--------|
| `src/styles/legal-pages.css` | -- | Shared scoped styles under `.legal-content` |
| `src/pages/Terms.tsx` | `/terms` | flowsert_terms.html (Version 1.0) |
| `src/pages/Privacy.tsx` | `/privacy` | flowsert_privacy.html (Version 1.0) |
| `src/pages/Subprocessors.tsx` | `/subprocessors` | flowsert_subprocessors.html (Version 1.0) |
| `src/pages/Security.tsx` | `/security` | flowsert_security.html (Version 1.0) |

---

### Phase 8: Public Footer

**New file: `src/components/PublicFooter.tsx`**

- Legal links: Terms, Privacy, Sub-Processors, Security, Trust (all same-tab)
- Copyright: "(c) 2026 FlowSert. All rights reserved."
- Responsive layout

**Integration**: Add to `Auth.tsx`, `About.tsx`, `FAQ.tsx`, `Contact.tsx`, all legal pages, Trust page, and Consent page.

---

### Phase 9: Trust Page

**New file: `src/pages/Trust.tsx`** at route `/trust`

Informational summary. No database changes.

---

### Routes in App.tsx

```text
Public (no ProtectedRoute wrapper):
  /terms          -> Terms.tsx
  /privacy        -> Privacy.tsx
  /subprocessors  -> Subprocessors.tsx
  /security       -> Security.tsx
  /trust          -> Trust.tsx
  /consent        -> Consent.tsx   <-- NOT in ProtectedRoute
```

---

### Files Summary

| File | Action |
|------|--------|
| `src/lib/legalVersions.ts` | New |
| `src/styles/legal-pages.css` | New |
| `src/pages/Terms.tsx` | New |
| `src/pages/Privacy.tsx` | New |
| `src/pages/Subprocessors.tsx` | New |
| `src/pages/Security.tsx` | New |
| `src/pages/Trust.tsx` | New |
| `src/pages/Consent.tsx` | New |
| `src/components/PublicFooter.tsx` | New |
| `src/App.tsx` | Modified -- add 6 public routes |
| `src/pages/Auth.tsx` | Modified -- consent checkbox + version recording |
| `src/pages/About.tsx` | Modified -- add PublicFooter |
| `src/pages/FAQ.tsx` | Modified -- add PublicFooter |
| `src/pages/Contact.tsx` | Modified -- add PublicFooter |
| `src/contexts/AuthContext.tsx` | Modified -- extend Profile, add `refreshProfile()` |
| `src/components/ProtectedRoute.tsx` | Modified -- add needsConsent redirect |
| `src/pages/RoleRedirect.tsx` | Modified -- add needsConsent redirect |
| `profiles` table | Migration -- add 3 columns |

