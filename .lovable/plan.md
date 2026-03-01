

## Problem

The **Categories tab** in Settings renders `CertificateCategoriesInner` (defined in `CategoriesSection.tsx`, line 203), which is a simple flat list showing only the category name and a delete button. It does **not** use `CertificateCategoriesManager.tsx` (which has the accordion with badges).

## Plan

**File: `src/components/CategoriesSection.tsx`**

1. **Import** `Badge` from `@/components/ui/badge` and `useCertificateTypes` from `@/hooks/useCertificateTypes`.

2. **In `CertificateCategoriesInner`** (line 203), add a call to `useCertificateTypes({ includeInactive: false })` to get the types data, and a helper to count types per category.

3. **In each category row** (lines 312-324), insert a `Badge` between the category name and the delete button showing `"{count} types"`:
   - `variant="secondary"` when count > 0
   - `variant="outline"` with `text-muted-foreground` when count is 0

No changes to layout, delete button, or add input. No database changes needed — the `certificate_types` query already exists and works via `useCertificateTypes`.

