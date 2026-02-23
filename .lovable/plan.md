

# Three Fixes: Sort Options Rename, New Sort, Business Documents in Projects, Company Card Explainer

**Risk: GREEN** -- purely UI text/layout changes and a read-only data fetch (no schema/RLS/auth changes).

## 1. Rename "Most Recent" to "Last Updated" and Add New "Most Recent" Sort

The current "Most Recent" sort option sorts by `updatedAt`. This should be renamed to "Last Updated". A new "Most Recent" option should sort by `createdAt` (registration date, newest first).

### Changes in `src/components/PersonnelFilters.tsx`
- Update `PersonnelSortOption` type from `'recent' | 'alphabetical'` to `'recent' | 'last_updated' | 'alphabetical'`
- Update `sortOptions` array to three items:
  - `{ value: 'recent', label: 'Most Recent' }` (new -- sorts by createdAt)
  - `{ value: 'last_updated', label: 'Last Updated' }` (renamed from old "recent")
  - `{ value: 'alphabetical', label: 'Alphabetical' }`

### Changes in `src/pages/AdminDashboard.tsx`
- Update the default sort state from `'recent'` to `'last_updated'` (preserving current default behavior)
- Update the sorting logic to handle three cases:
  - `'alphabetical'`: sort by name (unchanged)
  - `'last_updated'`: sort by `updatedAt` (the current "recent" logic)
  - `'recent'`: sort by `createdAt` (newest registrations first)

## 2. Show Business Documents in Every Project's Documents Tab

Company-uploaded documents (`business_documents` table) are global and should appear in the documents section of every project belonging to that business.

### Changes in `src/components/ProjectDocuments.tsx`
- Add a `businessId` prop (optional, passed from parent)
- On mount, fetch `business_documents` for the given `businessId` alongside project documents
- Render a separate "Company Documents" section (with a `Building2` icon and a subtle label like "Shared by your company") above or below the project-specific documents
- These documents are read-only in the project context (no delete button) -- clicking opens them via signed URL from `business-documents` bucket
- They should not be affected by the project's category filter

### Changes in `src/components/ProjectDetail.tsx`
- Pass `businessId` (from the project's `business_id`) to `ProjectDocuments`

## 3. Add Explainer Text in Company Card Documents Tab

### Changes in `src/components/CompanyCard.tsx`
- In the admin documents tab (line ~566-567), update the description text to:
  "Documents uploaded here are global and will be visible in the documents section of all your projects."

## Files Modified

| File | Change |
|------|--------|
| `src/components/PersonnelFilters.tsx` | Add `'last_updated'` to sort type, update sort options array to 3 items |
| `src/pages/AdminDashboard.tsx` | Change default sort to `'last_updated'`, add `'recent'` sort by `createdAt` |
| `src/components/ProjectDocuments.tsx` | Accept `businessId` prop, fetch and display business documents as read-only "Company Documents" section |
| `src/components/ProjectDetail.tsx` | Pass `businessId` to `ProjectDocuments` |
| `src/components/CompanyCard.tsx` | Update documents tab description to explain global visibility |

