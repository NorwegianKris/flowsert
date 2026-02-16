

## Remove Employment Filter from Personnel Filters

### Overview
Remove the "Employment" dropdown filter from the personnel filter bar since it duplicates the freelancers toggle (Include freelancers / Show freelancers only) that already exists above it.

### Changes

**1. `src/components/PersonnelFilters.tsx`**
- Remove `categoryFilters` and `onCategoryFiltersChange` from the props interface
- Remove the `employmentTypes` constant (lines 109-112)
- Remove the Employment Type Filter Popover (lines 265-307)
- Remove `categoryFilters` from the `hasActiveFilters` check and `clearAllFilters` function
- Remove the category filter badges from the active filters display section
- Remove the `categoryOpen` state variable

**2. `src/pages/AdminDashboard.tsx`**
- Remove the `categoryFilters` state (`useState<string[]>([])`)
- Remove the category filter logic from the `filteredPersonnel` memo (the line checking `categoryFilters`)
- Remove `categoryFilters` and `onCategoryFiltersChange` props from the `PersonnelFilters` component usage
- Remove `categoryFilters` from the `useMemo` dependency array
- Remove `categoryFilters` from the empty-state condition check

