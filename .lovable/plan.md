

## Two Fixes in TypeMergingPane

### Fix 1: Set `category_id` during grouping

In `executeGrouping()` (line 239), before the batch update loop, resolve the target type's `category_id` from the `mergedTypes` array. Then include it in the `.update()` call at line 273.

```typescript
// Before batch loop (around line 268):
const targetType = mergedTypes.find(t => t.id === targetTypeId);

// In the .update() call (line 273-276):
.update({
  certificate_type_id: targetTypeId,
  category_id: targetType?.category_id || null,
  needs_review: false,
})
```

### Fix 2: Add missing React Query invalidations

Add `queryClient.invalidateQueries({ queryKey: ["needs-review-count"] })` in two places:

1. **`executeGrouping()`** — after line 293 (alongside existing invalidations)
2. **`handleDismissCert()`** — after line 339 (alongside existing `["unmapped-certificates"]` invalidation)

### Anchor check
- Q1 (SQL/schema): No
- Q2 (edge functions/auth): No
- Q3 (access control): No
- Q4 (core filtering/compliance): Yes — category resolution is used for compliance views → 🟡 anchor recommended but these are small, well-understood fixes matching existing patterns

Both fixes are two-line changes matching patterns already established in `AISuggestDialog`.

