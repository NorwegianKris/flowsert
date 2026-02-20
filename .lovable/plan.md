

# Merge Job Role and Worker Groups into a Single "Workers" Filter

## Overview
Combine the "Job Role" and "Worker Groups" filter buttons into one unified "Workers" popover with an internal toggle to switch views -- following the same pattern as the existing Certificates filter (which toggles between Types, Categories, and Issuers).

## How It Will Work
- A single "Workers" button (Users icon) replaces both the "Job Role" and "Worker Groups" buttons
- Inside the popover, a two-option toggle switches between **Roles** and **Groups** views
- Switching views does NOT clear selections from the other view
- The button label shows the combined count of role + group selections (ungrouped is NOT counted)
- If "Include ungrouped" is active, a small "Ungrouped" badge chip appears in the active filter badges area (already exists today)
- All props remain unchanged -- no changes to AdminDashboard or the component interface

## Badge Count Logic
- Count = `roleFilters.length + workerGroupFilters.length`
- "Include ungrouped" is a mode flag, not counted in the badge number
- It already renders its own separate "Ungrouped" badge chip in the active filters area

## Technical Details

**File: `src/components/PersonnelFilters.tsx`** (only file changed)

1. **Remove** the separate "Job Role" popover (lines 184-230) and the separate "Worker Groups" popover (lines 424-488)
2. **Replace** `roleOpen` and `workerGroupOpen` state with a single `workersOpen` state
3. **Add** local state: `workersFilterView` of type `'roles' | 'groups'`, defaulting to `'roles'`
4. **Add** a new combined "Workers" popover in the same position, containing:
   - A `ToggleGroup` (single mode) with two items: "Roles" (Briefcase icon) and "Groups" (Users icon) -- mirrors the certificate filter pattern
   - When on "Roles": show the existing `workerCategories` checkbox list
   - When on "Groups": show the existing `workerGroups` checkbox list + "Include ungrouped" toggle
   - A "Clear" button at the bottom that clears only the active view's selections
5. **Button label**: `Workers` when nothing selected, otherwise `{count} selected` where count = `roleFilters.length + workerGroupFilters.length`
6. No changes to props, no changes to `hasActiveFilters`, `clearAllFilters`, or the active filter badges section -- they all continue to work as-is

