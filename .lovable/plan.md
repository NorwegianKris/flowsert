

## Plan: Project Invitation Email Fix + Settings CRUD Verification

### Prompt 7 — Project Invitation Email

**Root cause:** Two issues prevent the email from sending:

1. **Missing config.toml entry:** `send-project-invitation` is not listed in `supabase/config.toml`. The gateway enforces JWT verification by default, but the function handles its own auth internally. Without `verify_jwt = false`, the request is rejected at the gateway before reaching the function code.

2. **Unstable auth method:** The function uses `supabase.auth.getClaims(token)` (line 52), which is unreliable across `supabase-js` versions (same issue fixed in Prompt 6). Replace with `supabase.auth.getUser(token)`.

**Changes:**

| File | Change |
|------|--------|
| `supabase/config.toml` | Add `[functions.send-project-invitation]` with `verify_jwt = false` |
| `supabase/functions/send-project-invitation/index.ts` | Replace `getClaims` with `getUser` for stable auth |

After code changes, redeploy the edge function.

The client-side code in `useProjectInvitations.ts` is already correct — it passes email, name, and project details, and handles failures gracefully (logs error, doesn't block invitation creation).

### Prompt 8 — Admin Settings CRUD

After reviewing all four manager components:

1. **Certificate Types** (`CertificateTypesManager.tsx` + `useCertificateTypes.ts`): Uses React Query mutations with `queryClient.invalidateQueries`. Add, edit, archive, and restore all follow correct patterns. **No changes needed.**

2. **Issuer Types** (`IssuerTypesManager.tsx` + `useIssuerTypes.ts`): Same React Query pattern as certificate types. **No changes needed.**

3. **Categories** (`CertificateCategoriesManager.tsx`): Edit (rename) via pencil icon uses direct Supabase calls with `fetchCategories()` refresh. The code at lines 143-171 correctly handles rename, duplicate detection, and re-fetches. **No changes needed.**

4. **Departments** (`DepartmentsManager.tsx`): Uses direct Supabase calls with `as any` type assertions (since the table was added after type generation). Add and delete work correctly with `fetchCategories()` refresh. **No changes needed** — the CRUD logic is sound.

**Conclusion for Prompt 8:** All four CRUD operations are implemented correctly with proper error handling, duplicate detection, and immediate UI refresh. No code changes required. The operations should work as-is if the user is authenticated with the admin role.

### Summary

| File | Change |
|------|--------|
| `supabase/config.toml` | Add `send-project-invitation` entry |
| `supabase/functions/send-project-invitation/index.ts` | Replace `getClaims` → `getUser` |

Prompt 8 requires no code changes — all CRUD operations are correctly implemented.

