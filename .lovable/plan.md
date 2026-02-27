

## TypeMergingPane Fixes

**Risk: 🟢 GREEN** — UI rendering changes only. No schema or data changes.

### Fix 1: Left pane expanded view — show title_raw sub-groups instead of individual certificates

**Current**: Expanded view shows up to 5 individual certificate rows with personnel name, file link, and expiry date. With 103 certificates in "Diving", this is unmanageable.

**Target**: Show distinct `title_raw` values as a sub-list with counts. Each sub-item gets its own checkbox for independent selection.

**Implementation**:

1. **`src/hooks/useInputtedTypes.ts`**: Add a `raw_title_groups` field to the `InputtedType` interface containing `{ title_raw: string; count: number; personnel_count: number }[]` — built during the existing grouping loop by counting per `title_raw` within each `title_normalized` group. Remove the `certificates` array (no longer needed in expanded view).

2. **`src/components/TypeMergingPane.tsx` — selection model**: Change `selectedInputted` from `Set<string>` (title_normalized keys) to `Set<string>` (title_raw keys). The top-level row checkbox selects/deselects all its raw sub-items. Each sub-item checkbox toggles independently.

3. **`src/components/TypeMergingPane.tsx` — expanded UI (lines 565-643)**: Replace the "Included Certificates" section with a list of `raw_title_groups` entries. Each entry shows: checkbox + title_raw text + count badge (e.g. "103"). Remove all individual file link, personnel name, and expiry date rendering.

4. **`src/components/TypeMergingPane.tsx` — executeGrouping (lines 267-348)**: Update to iterate over selected `title_raw` values. For each, query certificates matching that exact `title_raw` (not `title_normalized`) and update them. Create alias using the raw value.

5. **`src/components/TypeMergingPane.tsx` — selectedInputtedData and totalSelectedCerts memos**: Derive from the new selection model, summing counts from matching `raw_title_groups` entries across all inputted types.

### Fix 2: Right pane — database has 8 active types, not 64

Database query confirms there are exactly **8 active certificate_types** for this business. The code is correct — `filteredMerged` shows all active types with no usage-count filter. The "64" figure may refer to the number of distinct inputted types (unmapped raw entries), not canonical types.

No code change needed for Fix 2. The right pane already has a `ScrollArea` wrapping the list, which will handle scrolling when more types are added.

### Files modified
| File | Change |
|---|---|
| `src/hooks/useInputtedTypes.ts` | Add `raw_title_groups` to InputtedType, remove `certificates` array |
| `src/components/TypeMergingPane.tsx` | Selection model → title_raw, expanded view → raw sub-groups, executeGrouping → filter by title_raw |

### What does NOT change
- Right pane: radio select, category grouping, all interaction — untouched
- Center action area: "Group into Selected", "Create & Group" buttons — untouched
- All dialogs — untouched

