

# Fix Auth UI: Signup Session Handling + Existing-User Messaging + Password Reset + Callback Route

## Risk: YELLOW (auth UI logic + new route, no DB/RLS changes)

## Files to change

### 1. `src/contexts/AuthContext.tsx` (3 edits)

**Line 25** — Update `signUp` return type:
```typescript
signUp: (...) => Promise<{ data: any; error: Error | null }>;
```

**Lines 153-168** — Return `data` + hardcode production redirect:
```typescript
const signUp = async (email, password, fullName?, inviteToken?, jobSeekerToken?, jobSeekerRole?) => {
  const { data, error } = await supabase.auth.signUp({
    email, password,
    options: {
      emailRedirectTo: 'https://app.flowsert.com/auth/callback',
      data: { full_name: fullName, invite_token: inviteToken || undefined, job_seeker_token: jobSeekerToken || undefined, job_seeker_role: jobSeekerRole || undefined }
    }
  });
  return { data, error: error as Error | null };
};
```

### 2. `src/pages/Auth.tsx` — Replace `handleSignUp` (lines 281-330)

Full branching:
- **Error + "already registered" / "already exists" / "user already registered"** (case-insensitive) → non-destructive toast "Account already exists" + `setAuthMode('signin')`
- **Error otherwise** → destructive toast
- **`data?.session` exists** → update profile consent (TERMS_VERSION, PRIVACY_VERSION), toast "You are now logged in", `setAuthDialogOpen(false)`
- **`data?.user` exists, no session** → toast "Check your email to confirm" + `setAuthMode('signin')`. **No** profile update, **no** dialog close.
- **Fallback** → toast "Please log in or reset" + `setAuthMode('signin')`

### 3. `src/pages/Auth.tsx` — Fix `handleForgotPassword` (lines 342-344, 354-357)

- Hardcode `redirectTo: 'https://app.flowsert.com/auth?type=recovery'`
- Neutral success: `'If an account exists for this email, a reset link has been sent.'`

### 4. New file: `src/pages/AuthCallback.tsx`

Minimal page that handles `/auth/callback`:
- On mount, call `supabase.auth.getSession()`
- If session exists → `navigate('/', { replace: true })`
- If no session → show "Email confirmed. You can now log in." with a link to `/auth`
- Clean card UI matching the existing reset password card style

### 5. `src/App.tsx` — Add route (line ~43)

```tsx
<Route path="/auth/callback" element={<AuthCallback />} />
```

## What stays the same
- Sign-in handler, invite flow, job seeker flow, `handleResetPassword`
- All UI/layout code beyond the handlers
- No database migrations or RLS changes

