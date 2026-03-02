


## FlowSert — Full QA Checklist Results (Section 1: Authentication & Tenant Isolation)

### 1.1 New user signup creates business correctly
**Status: N/A (by design)**
New users cannot self-create businesses. The platform is invitation-only. Business creation is an admin provisioning step. The `handle_new_user` trigger raises an exception if no valid invitation exists: `"Registration requires a valid invitation."` This is correct per the private intranet model.

### 1.2 seed_default_certificate_categories trigger fires — 19 default categories exist
**Status: PASS**
- Trigger `trg_seed_default_certificate_categories` exists on the `businesses` table
- Verified: 19 categories exist for the first business in the database
- The trigger function inserts all 19 categories idempotently using `WHERE NOT EXISTS`

### 1.3 Login redirects to correct dashboard per role
**Status: PASS (code review)**
- `RoleRedirect` (`/` route) checks role after auth:
  - `admin` or `manager` → `/admin`
  - `worker` → `/worker`
  - No role → `/auth`
- `ProtectedRoute` enforces `requiredRole` / `allowedRoles` and redirects unauthorized users
- Consent check (`needsConsent`) redirects to `/consent` before dashboard

### 1.4 Logout clears session fully — no stale data on re-login
**Status: PASS (code review)**
- `signOut()` in AuthContext clears all local state: `user`, `session`, `profile`, `role` set to `null`
- Falls back to `scope: 'local'` signout if global fails
- Login handler in `Auth.tsx` line 255 calls `supabase.auth.signOut({ scope: 'local' })` before sign-in to clear stale tokens
- `fetchedUserIdRef` is reset to `null` on sign-out, ensuring fresh fetch on next login

### 1.5 Admin cannot see data from another tenant's business
**Status: PASS**
- All key tables use business-scoped RLS policies via `get_user_business_id(auth.uid())`
- The February 2026 remediation (Migration 20260225214207) dropped 25 legacy permissive "Require authentication" policies
- Only one RESTRICTIVE "Require authentication" policy remains: on `departments` (correct — it's an additional gate, not a bypass)
- Worker personnel UPDATE/SELECT policies found without explicit `business_id` check, but they use `user_id = auth.uid()` which inherently scopes to the user's own record

### 1.6 Worker cannot see data from another tenant's business
**Status: PASS**
- Worker access is gated by `can_access_personnel()` which checks `p.user_id = auth.uid()` for workers
- Worker project access uses `can_worker_access_project()` which requires assignment or invitation
- `useWorkerBusinesses` hook fetches personnel records for `user_id = user.id`, then fetches businesses via `IN` clause (RLS on `businesses` table enforces worker access via personnel EXISTS check)

### 1.7 Cross-tenant storage isolation: admin cannot access another tenant's project documents
**Status: PASS**
- All three project-documents policies use `proj.business_id = get_user_business_id(auth.uid())` scoping
- The broken duplicate policies ("Admins can delete/upload project documents") were dropped in migration `20260302073353`
- `storageUtils.ts` returns `null` on signed URL failure (no fallback to public URL)
- Project-documents bucket is private (`Is Public: No`)

### 1.8 Verify only three storage policies exist on project-documents bucket
**Status: PASS**
Exactly three policies confirmed:

| Policy | Command |
|---|---|
| Secure access to project documents | SELECT |
| Secure delete from project documents | DELETE |
| Secure upload to project documents | INSERT |

No stray or duplicate policies remain.

---

### Summary

| Check | Result |
|---|---|
| 1.1 Business creation on signup | N/A (invitation-only model) |
| 1.2 Default certificate categories (19) | PASS |
| 1.3 Role-based redirect | PASS |
| 1.4 Logout clears session | PASS |
| 1.5 Admin cross-tenant isolation | PASS |
| 1.6 Worker cross-tenant isolation | PASS |
| 1.7 Storage cross-tenant isolation | PASS |
| 1.8 Only 3 project-documents policies | PASS |

**All 7 applicable checks pass. No issues found in Section 1.**

### Other Storage Buckets (bonus audit)

| Bucket | Policies | Scoping |
|---|---|---|
| avatars (public) | 4 policies | User-scoped upload/update/delete, public read |
| business-documents | 4 policies | business_id scoped |
| certificate-documents | 5 policies | business_id + personnel scoped, freelancer blocking |
| personnel-documents | 3 policies | business_id + personnel scoped |
| project-documents | 3 policies | business_id scoped via projects table |

All buckets have proper tenant isolation policies.
