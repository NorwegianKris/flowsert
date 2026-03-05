

## Fix: Move Active Filter Tags to a Second Row

**File: `src/components/PersonnelFilters.tsx`**

Wrap the return in a parent `<div>` with two rows:

1. **Row 1** (lines 121-425): The existing `flex flex-nowrap` row with all filter dropdowns and the sort button. Remove the "Clear all" button, active filter badges, and result count from this row.

2. **Row 2** (conditionally rendered when `hasActiveFilters`): A slim secondary row showing:
   - Label: "Active filters:"
   - Filter badges (existing badge markup)
   - Result count
   - "Clear all" button (pushed to the right with `ml-auto`)

This keeps the dropdowns undisturbed on row 1 and lets tags wrap naturally on row 2.

### Structure

```text
<div>                              ← new wrapper
  <div flex-nowrap row-1>          ← existing filter bar (dropdowns + sort only)
    Filter by: | Availability | Location | Certificates | Department | Compliance | [Sort ▾]
  </div>
  {hasActiveFilters && (
    <div flex-wrap row-2>          ← new second row
      Active filters: [Expiring Soon ×] [Location ×] ...  5 results  Clear all
    </div>
  )}
</div>
```

### Specific edits

- **Line 120-121**: Wrap in outer `<div>`, keep inner div as `flex flex-nowrap items-center gap-3 mb-1` (reduce mb from 4 to 1 when active filters present).
- **Lines 427-510**: Move the "Clear all" button, active filter badges block, and result count out of the first row and into a new sibling `<div className="flex flex-wrap items-center gap-2 mb-4 text-sm">` that contains:
  - `<span className="text-muted-foreground text-xs">Active filters:</span>`
  - The existing badge elements
  - A separator `·`
  - Result count
  - `ml-auto` Clear all button
- **Line 511**: Close the new wrapper `</div>`.

Pure UI/layout change -- no logic or data changes.

