

## Two Fixes in TypeMergingPane

**Risk: GREEN** — Pure UI + query filter logic. No schema changes.

### Fix 1 — Column proportions in all states

Looking at the code, all three column divs already have the correct `style={{ flex: "0 0 X%" }}` props. The likely issue is the parent container has `gap-4 lg:gap-0` — the `gap-4` may be causing overflow on some viewports or the `flex-col` fallback is interfering. 

**Change**: Remove `gap-4` from the flex container (line 1292) and ensure `lg:gap-0` is the only gap behavior. Also add `overflow-hidden` to prevent any flex overflow from compressing columns:

Line 1292: `"flex flex-col lg:flex-row gap-4 lg:gap-0"` → `"flex flex-col lg:flex-row lg:gap-0 gap-4"` and add `min-w-0` to each column div to prevent flex shrink overflow. Actually the real fix: add `min-w-0 overflow-hidden` to the right pane div so its content can't force the flex to compress.

### Fix 2 — AI Suggest uses filtered certificates

Lines 505-516: The `handleAISuggest` function queries supabase directly for ALL unmapped certificates, ignoring the `leftSearch` and `leftCategoryFilter` state.

**Change**: Apply the same filters the hook uses:
- If `leftCategoryFilter` is set, add `.eq("category_id", leftCategoryFilter)` to the query
- If `leftSearch` is set, add `.or(`title_raw.ilike.%${leftSearch}%`)` — and do client-side personnel name filtering on the result (matching the hook's behavior)
- Update `setAiCertCount` to reflect the filtered count, not totalUnmapped

This ensures the certificates sent to the AI match exactly what the user sees in the left pane.

### Files changed
- `src/components/TypeMergingPane.tsx` — both fixes

