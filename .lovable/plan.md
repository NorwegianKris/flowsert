

## Fixes for Certificate Types UI

**Risk: 🟢 GREEN** — Pure UI changes, no schema/data changes.

### Fix 1: TypeMergingPane right pane — verify no filtering issue

The `filteredMerged` memo (lines 198-211) already only filters by `is_active` and search text — no usage count filter exists. The `useCertificateTypes` hook fetches all active types for the business. Database confirms 8 active types, all with `usage_count > 0`, which means there are currently no zero-count types to observe a filtering bug.

However, I will double-check no other code path limits rendering. The grouping and rendering logic at lines 726-797 iterates `filteredMerged` directly — confirmed no additional filter. **This is already correct.** If the user creates a new type with zero certificates, it will appear.

### Fix 2: TypesManageList — accordion grouped by category

**File:** `src/components/CertificateTypesManager.tsx` (lines 230-332, the `TypesManageList` render)

Replace the flat `divide-y` list with category-grouped sections:
1. Group `filteredTypes` by `category_name` (fallback: "Uncategorized")
2. Sort groups alphabetically, "Uncategorized" last
3. Sort types alphabetically within each group
4. Render bold category header row (`font-semibold text-xs uppercase text-muted-foreground bg-muted/50 px-3 py-2 border-b`) before each group
5. Type rows keep their current layout: name + archived badge + category badge + edit/archive buttons
6. All dialog logic unchanged

### Files modified
| File | Change |
|---|---|
| `src/components/CertificateTypesManager.tsx` | TypesManageList: group types by category with bold headers |

