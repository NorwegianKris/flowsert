

## Left Pane Overhaul: Flat Certificate List

**Risk: 🟢 GREEN** — UI rendering + hook data shape change. No schema changes.

### Change 1: New hook `useUnmappedCertificates`

**File:** `src/hooks/useUnmappedCertificates.ts` (new file)

Create a dedicated hook that returns individual unmapped certificates (not grouped), with pagination support:

- Query `certificates` with join on `personnel!inner` filtering by `business_id`, `certificate_type_id IS NULL`, `unmapped_by IS NULL`, `title_raw IS NOT NULL`
- Also join `certificate_categories` via `category_id` for category name
- Return flat array of `{ id, title_raw, title_normalized, personnel_name, personnel_id, expiry_date, document_url, category_id, category_name, created_at }`
- Accept params: `search?: string`, `categoryFilter?: string`, `sortBy?: 'title_raw' | 'expiry_date' | 'personnel_name'`, `sortAsc?: boolean`, `limit?: number`
- Use `.range(0, limit - 1)` for pagination; expose a `total` count via `{ count: 'exact', head: false }`
- Export `UnmappedCertificate` interface

### Change 2: Rewrite left pane in TypeMergingPane

**File:** `src/components/TypeMergingPane.tsx`

**State changes:**
- Replace `useInputtedTypes` with `useUnmappedCertificates`
- `selectedInputted: Set<string>` now holds certificate IDs (not title_raw)
- Add state: `leftCategoryFilter`, `leftSortBy`, `visibleCount` (starts at 50)

**Header area (lines ~420-467):**
- Counter: "X unmapped certificates" (total from hook)
- Search box (searches title_raw + personnel name — passed to hook)
- Category filter dropdown (populated from existing `categories` state, passed to hook)
- Sort dropdown: "Title A-Z", "Expiry Date", "Personnel Name"
- Select all checkbox + selection count

**List rows (lines ~469-624):**
- Replace Collapsible/grouped rendering with flat rows
- Each row: Checkbox | Personnel name (bold) | title_raw | category badge (if category_id) | expiry date | file type icon (FileText for PDF, Image for jpg/png, File for other)
- No expand/collapse needed
- "Load more" button at bottom when `visibleCount < totalCount`, increments by 50

**Selection & mapping (executeGrouping, lines ~291-360):**
- Iterate selected certificate IDs directly
- For each unique `title_normalized` among selected certs, create alias → target type
- Update all selected certificate IDs: set `certificate_type_id`, clear `needs_review`
- This is simpler than before — direct ID-based updates, no title_raw matching needed

**Dismiss flow:**
- Dismiss button per row marks that single certificate as unmapped
- Bulk dismiss: select multiple → dismiss all selected

**Confirmation dialog (lines ~777-830):**
- Update text: "X certificates" instead of "X inputted types"

**Create dialog (lines ~832-904):**
- Same update: show certificate count not type count

### Change 3: Remove `useInputtedTypes` import

The hook itself stays (may be used elsewhere) but TypeMergingPane no longer imports it. Remove `useDismissInputtedType` import too — dismiss will work directly on certificate IDs.

### Files modified
| File | Change |
|---|---|
| `src/hooks/useUnmappedCertificates.ts` | New hook: flat paginated unmapped certificate list |
| `src/components/TypeMergingPane.tsx` | Complete left pane rewrite: flat list, filters, sort, ID-based selection |

### What does NOT change
- Right pane: category-grouped merged types, radio select — untouched
- Center action area: button labels change to "Assign Type" but logic flow identical
- Create & Group dialog — unchanged except count text
- Document viewer dialog — kept but simplified (click file icon to view)
- No schema changes, no hook deletions

