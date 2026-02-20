

# Remove "Include Ungrouped" Option from Workers Filter

## What Changes
Remove the "Include ungrouped" checkbox from the Groups view inside the Workers filter popover, along with its associated badge chip and all related props/state.

## Technical Details

**File: `src/components/PersonnelFilters.tsx`**
- Remove `includeUngrouped` and `onIncludeUngroupedChange` from the props interface
- Remove the "Include ungrouped" checkbox block (the separator + checkbox around lines 267-276)
- Remove `includeUngrouped` from the `hasActiveFilters` check
- Remove `onIncludeUngroupedChange?.(false)` from `clearAllFilters`
- Remove `includeUngrouped` from the Clear button visibility condition in the Groups view (line 283) -- only check `workerGroupFilters.length > 0`
- Remove `onIncludeUngroupedChange?.(false)` from the Clear button's onClick
- Remove the "Ungrouped" badge chip in the active filters area (lines 618-627)

**File: `src/pages/AdminDashboard.tsx`**
- Remove the `includeUngrouped` state (`useState(false)`)
- Remove `includeUngrouped` from the `usePersonnelGroupFilter` call (pass `false` directly or update the hook)
- Remove `includeUngrouped` and `onIncludeUngroupedChange` props from the `PersonnelFilters` component usage
- Remove `includeUngrouped` from the empty-state condition string (line 573)

No changes to filter logic or other props -- the worker group filter continues to work with selected groups only.

