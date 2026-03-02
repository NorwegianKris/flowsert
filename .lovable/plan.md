

## Plan: Fix Cross-Tenant Storage Gap + Clean Up Public URL Pattern

**Risk**: 🔴 Storage RLS policy migration — anchor required.

### 1. Migration: Fix project-documents storage policies

Drop and recreate both policies to add `business_id` scoping via the `projects` table:

- **DELETE policy**: Add `EXISTS (SELECT 1 FROM projects proj WHERE proj.id::text = (storage.foldername(name))[1] AND proj.business_id = get_user_business_id(auth.uid()))`
- **INSERT policy**: Same business_id scoping check

This closes the cross-tenant gap where any authenticated admin could manipulate files in another tenant's project folder.

### 2. Store relative `filePath` instead of `getPublicUrl()`

Replace `getPublicUrl()` calls with storing the relative path directly:

| File | Change |
|---|---|
| `src/components/AddCertificateDialog.tsx` (line 404–411) | Store `filePath` directly instead of `urlData.publicUrl` |
| `src/components/EditCertificateDialog.tsx` (line 337–341) | Store `filePath` directly instead of `urlData.publicUrl` |
| `src/components/ProjectDocuments.tsx` (line 287–297) | Store `fileName` directly instead of `urlData.publicUrl` |
| `src/components/EditProjectDialog.tsx` (line 102–111) | Remove dead `getPublicUrl()` call (already stores `filePath` as fallback) |

### 3. Remove signed URL fallback in storageUtils.ts

**File: `src/lib/storageUtils.ts`** (lines 33–37)

On `createSignedUrl` failure, return `null` instead of falling back to a non-functional public URL. Log the warning but don't mask the error.

### Files changed

| File | Action |
|---|---|
| Migration | DROP + CREATE two storage policies on `storage.objects` |
| `src/components/AddCertificateDialog.tsx` | Store relative path |
| `src/components/EditCertificateDialog.tsx` | Store relative path |
| `src/components/ProjectDocuments.tsx` | Store relative path |
| `src/components/EditProjectDialog.tsx` | Remove dead `getPublicUrl()` call |
| `src/lib/storageUtils.ts` | Return `null` on failure |

