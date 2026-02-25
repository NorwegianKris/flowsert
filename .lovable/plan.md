

# Plan: Create Internal Remediation Note

## What

Create a markdown file at `docs/2026-02-multi-tenant-isolation-remediation.md` documenting the P0 security fix that was just applied.

## Content

The note will cover:
- **Root cause:** 25 tables had PERMISSIVE "Require authentication" RLS policies with `USING (auth.uid() IS NOT NULL)`. Because these were PERMISSIVE (not RESTRICTIVE), they acted as independent grants — any authenticated user could read/write any tenant's data, bypassing business_id scoping.
- **Tables affected:** All 25 listed.
- **Fix:** Dropped all 25 policies via migration `20260225214207`.
- **Verification:** Catalog query confirming 0 bad policies remain; policy coverage check; cross-tenant smoke test.
- **Date:** 2026-02-25.

## Risk

GREEN — documentation only, no schema/policy/code changes.

