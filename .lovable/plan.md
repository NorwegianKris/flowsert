

# P0 Security Remediation — Corrected Final Plan

## Pre-Migration State (Just Verified via pg_policy Catalog)

25 PERMISSIVE "Require authentication for \<table\>" policies confirmed using the canonical `pg_policy` catalog query (not the `pg_policies` view). All 25 have `polcmd: *` (FOR ALL) and `qual: (auth.uid() IS NOT NULL)`.

## Migration

Single migration, 25 DROP POLICY statements. Wrapped in BEGIN/COMMIT.

```sql
BEGIN;

DROP POLICY IF EXISTS "Require authentication for availability" ON public.availability;
DROP POLICY IF EXISTS "Require authentication for business_documents" ON public.business_documents;
DROP POLICY IF EXISTS "Require authentication for businesses" ON public.businesses;
DROP POLICY IF EXISTS "Require authentication for certificate_aliases" ON public.certificate_aliases;
DROP POLICY IF EXISTS "Require authentication for certificate_categories" ON public.certificate_categories;
DROP POLICY IF EXISTS "Require authentication for certificate_types" ON public.certificate_types;
DROP POLICY IF EXISTS "Require authentication for certificates" ON public.certificates;
DROP POLICY IF EXISTS "Require authentication for direct_messages" ON public.direct_messages;
DROP POLICY IF EXISTS "Require authentication for document_categories" ON public.document_categories;
DROP POLICY IF EXISTS "Require authentication for freelancer_invitations" ON public.freelancer_invitations;
DROP POLICY IF EXISTS "Require authentication for invitations" ON public.invitations;
DROP POLICY IF EXISTS "Require authentication for issuer_aliases" ON public.issuer_aliases;
DROP POLICY IF EXISTS "Require authentication for issuer_types" ON public.issuer_types;
DROP POLICY IF EXISTS "Require authentication for personnel" ON public.personnel;
DROP POLICY IF EXISTS "Require authentication for personnel_document_categories" ON public.personnel_document_categories;
DROP POLICY IF EXISTS "Require authentication for personnel_documents" ON public.personnel_documents;
DROP POLICY IF EXISTS "Require authentication for profiles" ON public.profiles;
DROP POLICY IF EXISTS "Require authentication for project_applications" ON public.project_applications;
DROP POLICY IF EXISTS "Require authentication for project_calendar_items" ON public.project_calendar_items;
DROP POLICY IF EXISTS "Require authentication for project_document_categories" ON public.project_document_categories;
DROP POLICY IF EXISTS "Require authentication for project_documents" ON public.project_documents;
DROP POLICY IF EXISTS "Require authentication for project_invitations" ON public.project_invitations;
DROP POLICY IF EXISTS "Require authentication for projects" ON public.projects;
DROP POLICY IF EXISTS "Require authentication for user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Require authentication for worker_categories" ON public.worker_categories;

COMMIT;
```

NOT touched: `departments` (already RESTRICTIVE).

## Post-Migration Verification

### Check 1 — Canonical catalog query (zero rows expected)

```sql
SELECT
  n.nspname AS schemaname,
  c.relname AS tablename,
  p.polname,
  CASE p.polpermissive WHEN true THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END AS permissive,
  p.polcmd,
  pg_get_expr(p.polqual, p.polrelid) AS qual
FROM pg_policy p
JOIN pg_class c ON c.oid = p.polrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND p.polpermissive = true
  AND pg_get_expr(p.polqual, p.polrelid) ILIKE '%auth.uid()%not null%'
  AND p.polname ILIKE 'Require authentication for %'
ORDER BY c.relname, p.polname;
```

Expected: **0 rows**.

### Check 2 — No table at zero permissive policies

```sql
SELECT tablename, COUNT(*) AS permissive_policy_count
FROM pg_policies
WHERE schemaname='public'
  AND permissive='PERMISSIVE'
GROUP BY tablename
ORDER BY permissive_policy_count ASC, tablename;
```

Expected: no table at 0.

### Check 3 — Cross-tenant smoke test (via app, not service role)

Log in as kmu@live.no (FlowSert TestCo) — Personnel/Projects/Certificates should be empty.
Switch back to Techno Dive — everything reappears.

## Safe Rollback (per-table, RESTRICTIVE only)

```sql
CREATE POLICY "Require authentication for <table>"
  ON public.<table>
  AS RESTRICTIVE
  FOR ALL
  USING (auth.uid() IS NOT NULL);
```

## Risk

RED — 25 RLS policies across all multi-tenant tables. Access tightening only. No schema/data/code changes. Anchor required before publish.

