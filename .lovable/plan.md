

## Verification Results: Cross-Tenant Storage Fix

### Migration: Applied Successfully
The migration ran at 2026-03-02 and both policies were dropped and recreated. Confirmed in database logs.

### Policy Audit: Bug Found — But Security Is Intact

There are now **duplicate** DELETE and INSERT policies for `project-documents`:

| Policy | Command | `foldername()` reference | Status |
|---|---|---|---|
| "Admins can delete project documents" | DELETE | `storage.foldername(proj.name)` | **BROKEN** — resolves to project's display name, not storage path |
| "Secure delete from project documents" | DELETE | `storage.foldername(objects.name)` | CORRECT — business_id scoped |
| "Admins can upload project documents" | INSERT | `storage.foldername(proj.name)` | **BROKEN** — same bug |
| "Secure upload to project documents" | INSERT | `storage.foldername(objects.name)` | CORRECT — business_id scoped |
| "Secure access to project documents" | SELECT | `storage.foldername(objects.name)` | CORRECT |

**Root cause:** Inside the `EXISTS` subquery, bare `name` resolves to `proj.name` (the projects table column) instead of `objects.name` (the storage object path). The migration should have used `objects.name`.

**Security impact: NONE.** The broken policies compare `proj.id::text` against `foldername(proj.name)` which never matches, so they fail closed (deny everything). All legitimate access flows through the correctly-scoped "Secure" policies that were already in place.

### Cross-Tenant Status: CLOSED

The old loose "Admins can delete/upload" policies (which only checked `has_role(admin)` without business_id scoping) are **gone**. Replaced by broken-but-deny duplicates. The "Secure" policies gate all real access with proper `business_id = get_user_business_id(auth.uid())` checks.

### Recommended Fix

Drop the two broken duplicate policies since the "Secure" policies already cover the same operations correctly:

```sql
DROP POLICY "Admins can delete project documents" ON storage.objects;
DROP POLICY "Admins can upload project documents" ON storage.objects;
```

This is a GREEN cleanup migration — removes non-functional duplicates, no behavior change.

### Files Changed Summary

| Item | Status |
|---|---|
| Storage RLS: cross-tenant gap | Closed (via existing "Secure" policies) |
| `AddCertificateDialog.tsx` | Stores relative path — correct |
| `EditCertificateDialog.tsx` | Stores relative path — correct |
| `ProjectDocuments.tsx` | Stores relative path — correct |
| `EditProjectDialog.tsx` | Dead `getPublicUrl()` removed — correct |
| `storageUtils.ts` | Returns `null` on failure — correct |

