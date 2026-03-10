

## Bug Fix: Assigned Projects overlap logic for period selection

### Problem
Line 522 only checks projects for the `isSingle` case. When a date range is selected, the code falls through to the else branch and always shows "No projects in this period" — there's no range overlap query at all.

### Fix — `src/components/AvailabilityCalendar.tsx`

**1. Add a `getProjectsInRange` helper** (after `getProjectsOnDate`, ~line 190):
- Takes `startDate` and `endDate` parameters
- Iterates `allProjectOnPeriods`, collects unique projects where the on-period intersects the selected range using standard interval overlap: `periodStart <= endDate && periodEnd >= startDate`
- Returns same shape as `getProjectsOnDate`

**2. Update the JSX** (lines 522-563):
- Compute projects list: if `isSingle`, use `getProjectsOnDate(range.from)`; otherwise use `getProjectsInRange(range.from, range.to)`
- Render the project cards for both cases (not just single), showing "No projects assigned" / "No projects in this period" only when the list is truly empty

