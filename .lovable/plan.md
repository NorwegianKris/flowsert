

## Batch 2: OCR Category Wiring + Bulk Approve Progress

### Prompt 1 — Wire OCR Category to DB + Show in Triage

**Assessment after reading the code:**

The category_id is **already being written** during the certificate upload flow:
- `SmartCertificateUpload.tsx` (line 86-93): resolves `matchedCategory` → `matchedCategoryId`
- `AddCertificateDialog.tsx` (line 400): writes `category_id: cert.categoryId` to DB
- `TypeMergingPane.tsx` (line 254-257): writes `category_id: targetType?.category_id` when admin assigns a type
- `AISuggestDialog.tsx` (line 459, 481, 552): writes `category_id` during both single and bulk approvals

**Remaining gap — when admin selects a type from CertificateTypeSelector dropdown, the category_id is not updated from that type's category:**
- In `AddCertificateDialog.tsx` lines 806-812, when `onChange` fires for the type selector, it sets `certificateTypeId` and `certificateTypeName` but does NOT update `categoryId` from the selected type's `category_id`.

**Similarly, when alias auto-match fires** (line 846-851), it sets `certificateTypeId`, `certificateTypeName`, `aliasAutoMatched` but does NOT set `categoryId` from the matched type's category.

**For the triage queue UI:** `TypeMergingPane.tsx` already shows `cert.category_name` (line 482-485) on unmapped cert rows. The suggested category IS shown.

**Changes needed:**

**File: `src/components/AddCertificateDialog.tsx`**
1. When `CertificateTypeSelector.onChange` fires (line 806-812), also update `categoryId` from the selected type's `category_id`. This requires accessing the types list to look up the category.
2. When alias auto-match "Use this type" is clicked (line 846-851), also update `categoryId` from `aliasMatch.category_id` (need to verify this field exists on the alias match result).

**File: `src/components/CertificateTypeSelector.tsx`**
3. Extend the `onChange` callback signature to also pass `categoryId` so the parent can set it. Currently it only passes `(typeId, typeName)`.

Risk: 🟡 Medium — touches certificate insert logic. Anchor recommended.

---

### Prompt 2 — Bulk Approve Progress Bar + Counter

**Current state:** All four bulk approve functions show a `<Loader2>` spinner on the button during processing and fire a toast on completion. No progress bar or live counter.

**Four bulk approve functions to update:**

| File | Function | Processing style |
|------|----------|-----------------|
| `AISuggestDialog.tsx` | `handleApproveAll` (line 527) | Batches of 100 by type group |
| `AISuggestDialog.tsx` | `handleApproveAllNewTypes` (line 612) | Sequential per row via `handleApprove` |
| `AIIssuerSuggestDialog.tsx` | `handleApproveAll` (line 460) | Sequential per row via `handleApprove` |
| `AIIssuerSuggestDialog.tsx` | `handleApproveAllNewIssuers` (line 489) | Sequential per row via `handleApprove` |

**Changes needed:**

**File: `src/components/AISuggestDialog.tsx`**
1. Add state: `bulkProgress: { current: number; total: number } | null` and `newTypeBulkProgress` (same shape)
2. In `handleApproveAll`: set total = `pending.length`, increment current after each batch/type-group processes
3. In `handleApproveAllNewTypes`: set total = `pendingNew.length`, increment current after each `handleApprove` call
4. Replace spinner in the "Approve All" button area (line 736-755) with a progress bar + counter when `bulkProgress` is set: `<Progress value={...} />` + "Processing X of Y..."
5. On completion, show "Done — N items approved." inline before removing progress state
6. Same pattern for new types section

**File: `src/components/AIIssuerSuggestDialog.tsx`**
7. Same state additions and progress tracking for both `handleApproveAll` and `handleApproveAllNewIssuers`
8. Same UI replacement: spinner → progress bar + counter + completion summary

**UI pattern:** When bulk processing starts, replace the "Approve All (N)" button with a progress bar row:
```
[████████░░░░] Processing 14 of 47...
```
On completion, briefly show:
```
✓ Done — 47 items approved.
```
Then revert to normal state after 2 seconds.

Risk: 🟢 Low — pure UI feedback changes, no logic changes.

---

### Summary

| # | Change | Files | Risk |
|---|--------|-------|------|
| 1A | Update categoryId when type is selected or alias-matched | `AddCertificateDialog.tsx`, `CertificateTypeSelector.tsx` | 🟡 |
| 2 | Progress bar + counter for all 4 bulk approve functions | `AISuggestDialog.tsx`, `AIIssuerSuggestDialog.tsx` | 🟢 |

Note: Prompt 1B (show category in triage queue) is already implemented — `TypeMergingPane.tsx` displays `cert.category_name` on each unmapped certificate row.

