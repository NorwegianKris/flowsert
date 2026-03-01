

## Implementation Plan: Six Fixes for Certificate Taxonomy & UI

**Risk**: Fix 1 & 6 touch data resolution (🟡 anchor recommended). Fix 2/3/4/5 are UI-only (🟢).

---

### Fix 1 — Category Resolution via Type Chain

**File: `src/hooks/usePersonnel.ts`**

1. Update `DbCertificate` interface (line 51): change `certificate_types` to include nested category:
   ```typescript
   certificate_types: { name: string; certificate_categories: { name: string } | null } | null;
   ```

2. Update both Supabase queries to join through `certificate_types` to `certificate_categories`:
   - Line 72: `certificate_types(name, certificate_categories(name))`
   - Line 190: same

3. Update category resolution in both mapping blocks:
   - Line 129 and line 236: 
   ```typescript
   category: c.certificate_types?.certificate_categories?.name || c.certificate_categories?.name || undefined,
   ```

---

### Fix 2 — Dashboard Refresh on Settings Close

**File: `src/pages/AdminDashboard.tsx`**

1. Line 132: destructure `refetch` from `useNeedsReviewCount`:
   ```typescript
   const { count: needsReviewCount, refetch: refetchNeedsReview } = useNeedsReviewCount();
   ```

2. Line 765: add `refetchNeedsReview()` and `refetch()` to the settings close handler:
   ```typescript
   onClick={() => { setSettingsOpen(false); setSettingsDeepLink(null); refetchNeedsReview(); refetch(); }}
   ```

---

### Fix 3 — Unmapped Count Invalidation

**File: `src/components/AISuggestDialog.tsx`**

1. Line 162-167: add `certificates-needing-review` and `needs-review-count` to `invalidateAll`:
   ```typescript
   queryClient.invalidateQueries({ queryKey: ["certificates-needing-review"] });
   ```

**File: `src/hooks/useNeedsReviewCount.ts`** — convert to React Query so it responds to invalidation:
- Replace `useState`/`useEffect` with `useQuery` using key `["needs-review-count", businessId]`.
- Return `{ count: data ?? 0, loading: isLoading, refetch }`.

---

### Fix 4 — "Create & Approve All" Button

**File: `src/components/AISuggestDialog.tsx`**

1. Add state: `newTypeBulkProcessing` (boolean), `newTypeBulkConfirmOpen` (boolean).

2. Compute `allNewTypesHaveCategory`: every pending new type row (not overridden to existing, not approved/rejected) has a category selected via override or AI match.

3. Add a confirmation AlertDialog: "This will create X new certificate types. Continue?"

4. Add "Create & Approve All" button in the "New types suggested" `CollapsibleContent`, above the list (mirroring the existing types section pattern at lines 686-705). Enabled only when `allNewTypesHaveCategory && pendingNew.length > 0`.

5. Handler: loop through `pendingNew`, call `handleApprove` for each sequentially. Set `newTypeBulkProcessing` during.

---

### Fix 5 — Mobile Camera Capture

**File: `src/components/certificate-upload/UploadZone.tsx`**
- Add `capture="environment"` to both `<input>` elements (lines 57 and 88).

**File: `src/components/TaxonomySeedingTool.tsx`**
- Add `capture="environment"` to the file input (line 266).

---

### Fix 6 — Propagate `category_id` on Type Assignment

**File: `src/components/AISuggestDialog.tsx`** — in `handleApprove` (lines 445-484):

1. New type path (line 447): add `category_id` to the certificate update:
   ```typescript
   .update({ certificate_type_id: newType.id, category_id: categoryId || null, needs_review: false })
   ```

2. Existing type path (line 466-469): look up the type's `category_id` from `mergedTypes` and include it:
   ```typescript
   const matchedType = mergedTypes.find(t => t.id === typeId);
   .update({ certificate_type_id: typeId, category_id: matchedType?.category_id || null, needs_review: false })
   ```

3. Bulk approve `handleApproveAll` (line 534): same — look up type's `category_id` and include in batch update.

**File: `src/hooks/useCertificatesNeedingReview.ts`** — `useBulkUpdateCertificates` (line 148):

1. Accept `categoryId` in mutation params:
   ```typescript
   { titleNormalized: string; certificateTypeId: string; categoryId?: string | null; limit?: number }
   ```

2. Include in update payload (line 188):
   ```typescript
   .update({ certificate_type_id: certificateTypeId, category_id: categoryId ?? null, needs_review: false })
   ```

**File: `src/components/CertificateReviewQueue.tsx`** — callers of `useBulkUpdateCertificates` need to pass the type's `category_id`. Find where the mutation is called and add the `categoryId` param from the selected type.

**RescanCertificatesTool** — already sets `category_id` (lines 215, 230). No change needed.

---

### Files changed

| File | Fixes |
|---|---|
| `src/hooks/usePersonnel.ts` | 1 |
| `src/pages/AdminDashboard.tsx` | 2 |
| `src/components/AISuggestDialog.tsx` | 3, 4, 6 |
| `src/hooks/useNeedsReviewCount.ts` | 3 |
| `src/hooks/useCertificatesNeedingReview.ts` | 6 |
| `src/components/CertificateReviewQueue.tsx` | 6 |
| `src/components/certificate-upload/UploadZone.tsx` | 5 |
| `src/components/TaxonomySeedingTool.tsx` | 5 |

