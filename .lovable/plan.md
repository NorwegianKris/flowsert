

# Add Search Results Count to Personnel Filters

## What Changes

A results count indicator (e.g., "12 results") will appear on the right side of the applied filter badges row, giving admins immediate feedback on how many personnel match the current filters.

## Changes

### 1. `src/components/PersonnelFilters.tsx`
- Add a new optional prop `resultCount?: number` to the interface
- After the active filter badges section (line ~559), add a results count display that shows when filters are active
- Display format: "X results" in muted text, right-aligned using `ml-auto`

### 2. `src/pages/AdminDashboard.tsx`
- Pass `resultCount={filteredPersonnel.length}` to the `PersonnelFilters` component

## Visual Result

When filters are applied, the filter row will show:
```text
[Filter badges...] ·····························  12 results
```

When no filters are active, no count is shown (the full list is visible anyway).

