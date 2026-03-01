

## Analysis

The component **already has** type-count badges on each category row (lines 198-200). They use `variant="secondary"` for all counts, including zero.

The only change needed: when the count is 0, use a muted style (e.g., `variant="outline"` with `text-muted-foreground`) so empty categories are visually distinct from populated ones.

## Plan

**File: `src/components/CertificateCategoriesManager.tsx`**

Lines 198-200 — conditionally set the badge variant based on whether `types.length` is 0:
- `types.length > 0`: keep `variant="secondary"` (current style)
- `types.length === 0`: use `variant="outline"` with `text-muted-foreground` class

Single-line change, no new queries needed — the type count is already computed from `getTypesForCategory()`.

