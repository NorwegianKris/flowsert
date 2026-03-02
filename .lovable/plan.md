

## Fix: Add missing React Query invalidations to RescanCertificatesTool

### What's already done (no changes needed)
- **Fix 1** (category_id in `executeGrouping`): Already implemented at lines 268/277 of `TypeMergingPane.tsx`
- **Fix 2** (invalidations in `TypeMergingPane`): Already implemented at lines 294-297 and 343-344

### What needs fixing
**RescanCertificatesTool.tsx** has no `queryClient` usage at all. After processing completes, dashboard counts and triage queue stay stale until manual refresh.

### Changes

**`src/components/RescanCertificatesTool.tsx`**
1. Import `useQueryClient` from `@tanstack/react-query`
2. Add `const queryClient = useQueryClient()` inside the component
3. After processing completes (just before `setProcessing(false)` around the end of `handleRescan`), add:
   ```ts
   queryClient.invalidateQueries({ queryKey: ["needs-review-count"] });
   queryClient.invalidateQueries({ queryKey: ["unmapped-certificates"] });
   queryClient.invalidateQueries({ queryKey: ["certificates"] });
   queryClient.invalidateQueries({ queryKey: ["certificate-type-usage"] });
   ```

This matches the invalidation pattern used in both `AISuggestDialog` and `TypeMergingPane`.

### Anchor check
- Q1 (SQL/schema): No
- Q2 (edge functions/auth): No
- Q3 (access control): No
- Q4 (core filtering/compliance): No — cache invalidation only
- Q5 (UI only): Yes → 🟢 anchor optional

