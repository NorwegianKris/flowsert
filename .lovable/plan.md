## Security Baseline v1

**Established:** 2026-02-18

### Architecture

- **RLS-first**: All 25 tables have RLS enabled with 127+ policies
- **Tenant isolation**: Enforced via `business_id` through `get_user_business_id(auth.uid())`
- **Role-based access**: `has_role()` SECURITY DEFINER function checks `user_roles` table
- **Personnel access**: `can_access_personnel()` scopes admin to business, worker to own record

### Data Protection

- **project_messages**: Immutable (no UPDATE/DELETE policies). Worker SELECT via `can_worker_access_project()` (invitation/assignment). Admin SELECT via business_id.
- **feedback**: Worker sees only own (`user_id = auth.uid()`). Admin sees business-scoped. INSERT enforces `user_id = auth.uid()`. No UPDATE.
- **direct_messages**: Worker sees only own personnel threads (`personnel.user_id = auth.uid()`). Admin sees business-scoped. DB rate limit: 30 msgs/min/user via `enforce_rate_limit()` trigger.

### Rate Limiting

- **Direct messages**: DB-level trigger `trg_limit_direct_messages` → `enforce_rate_limit('direct_messages:<uid>', 30, 60)`
- **AI edge functions**: JWT validation + RPC `enforce_rate_limit('ai_*:<userId>', 10, 60)` on `certificate-chat`, `suggest-project-personnel`, `extract-certificate-data`. Returns 429.
- **rate_limits table**: RLS enabled, no policies (intentional — only accessed by SECURITY DEFINER functions)

### Authentication & Authorization

- **delete-user edge function**: Dual superadmin protection (admin role + email match), self-deletion block, auth-level + profile-level superadmin guard
- **Leaked password protection**: Recommended enabled, min length 10
- **Signup**: Invitation-only (`handle_new_user` trigger rejects signups without valid token)

### Hotfixes Applied

- `REVOKE EXECUTE ON FUNCTION enforce_rate_limit(text,int,int) FROM anon` — anon had inherited execute via separate grant
- `REVOKE EXECUTE ON FUNCTION trg_limit_direct_messages() FROM anon` — good hygiene, least-privilege
- `REVOKE EXECUTE ON FUNCTION trg_limit_direct_messages() FROM public` — public pseudo-role also had execute

### Runtime Isolation Tests (2026-02-18)

- **DM isolation**: 4 real DM rows for personnel `a344a14e` (Pichet Poonsawat). Worker SELECT policy enforces `personnel.user_id = auth.uid()`. Worker Zoran (`user_id 0f2756a6`) cannot access — ownership check fails.
- **Feedback isolation**: 7 rows across 4 user_ids. Worker SELECT enforces `user_id = auth.uid()`. Cross-user access blocked.
- **Project chat**: 1 real message in project `2749b0a6` with empty `assigned_personnel`. Worker SELECT enforces `can_worker_access_project()`. Unassigned workers blocked.

### Known Intentional Warnings

- `rate_limits` table: RLS enabled, no policies — accessed only by SECURITY DEFINER function `enforce_rate_limit()`. No direct client access possible.

### ACL Verification (2026-02-18)

- `enforce_rate_limit`: `{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}` — no anon, no public ✅
- `trg_limit_direct_messages`: `{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}` — no anon, no public ✅
