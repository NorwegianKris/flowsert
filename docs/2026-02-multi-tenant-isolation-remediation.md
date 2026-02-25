# 2026-02 Multi-Tenant Isolation Remediation

**Date:** 2026-02-25
**Severity:** P0 — Critical
**Status:** Resolved

---

## Root Cause

25 tables had PERMISSIVE RLS policies named `"Require authentication for <table>"` with the clause:

```sql
USING (auth.uid() IS NOT NULL)
```

Because these policies were **PERMISSIVE** (the PostgreSQL default), they acted as independent grants that were OR-combined with the existing tenant-scoped policies. This meant **any authenticated user could read and write any tenant's data**, completely bypassing `business_id` scoping.

## Tables Affected (25)

| # | Table |
|---|-------|
| 1 | `availability` |
| 2 | `business_documents` |
| 3 | `businesses` |
| 4 | `certificate_aliases` |
| 5 | `certificate_categories` |
| 6 | `certificate_types` |
| 7 | `certificates` |
| 8 | `direct_messages` |
| 9 | `document_categories` |
| 10 | `freelancer_invitations` |
| 11 | `invitations` |
| 12 | `issuer_aliases` |
| 13 | `issuer_types` |
| 14 | `personnel` |
| 15 | `personnel_document_categories` |
| 16 | `personnel_documents` |
| 17 | `profiles` |
| 18 | `project_applications` |
| 19 | `project_calendar_items` |
| 20 | `project_document_categories` |
| 21 | `project_documents` |
| 22 | `project_invitations` |
| 23 | `projects` |
| 24 | `user_roles` |
| 25 | `worker_categories` |

## Fix Applied

All 25 overly-permissive policies were dropped in migration **`20260225214207`**:

```sql
DROP POLICY IF EXISTS "Require authentication for <table>" ON public.<table>;
-- repeated for all 25 tables
```

The existing tenant-scoped policies (using `business_id`, `user_id`, or helper functions like `can_access_personnel()`) remain in place and now correctly govern access without being overridden.

## Verification Steps

1. **Catalog query** — Confirmed 0 policies matching the bad pattern remain:
   ```sql
   SELECT polname, relname
   FROM pg_policy p JOIN pg_class c ON p.polrelid = c.oid
   WHERE polname LIKE 'Require authentication for %';
   -- Result: 0 rows
   ```

2. **Policy coverage check** — Verified every affected table still has at least one permissive policy scoped to `business_id` or equivalent.

3. **Cross-tenant smoke test** — Authenticated as user in Tenant A, confirmed queries to tenant-scoped tables return only Tenant A data.

4. **Profile revert verified** — Confirmed test profile correctly points back to original tenant via:
   ```sql
   SELECT id, business_id FROM public.profiles
   WHERE id = '6f4e9869-09b6-4329-8356-de6bcb7616f1';
   ```
