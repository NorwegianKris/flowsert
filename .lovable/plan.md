

## Merge Worker Filter into Custom Toggle on Personnel Tab

Cosmetic + filtering logic. No schema/RLS changes. 🟢

### Problem
The Personnel tab has `All | Employees | Freelancers` in its toggle group but no "Custom" option. The worker group filtering is handled separately via the `PersonnelFilters` popover. The Overview tab already has a "Custom" toggle that opens the `CustomPersonnelFilterDialog` with individuals, roles, and worker groups.

### Plan

#### 1. Add dedicated custom filter state for Personnel tab
Currently, the custom filter state (`customFilterPersonnelIds`, `customFilterRoles`, `customFilterWorkerGroupIds`) is shared/used only by the Overview tab. Add a parallel set for the Personnel tab:
- `personnelCustomIds`, `personnelCustomRoles`, `personnelCustomWorkerGroupIds`

#### 2. Widen `personnelTabFilter` type
Change from `'all' | 'employees' | 'freelancers'` to `'all' | 'employees' | 'freelancers' | 'custom'`.

#### 3. Pass custom filter props to Personnel tab's `FreelancerFilters`
Currently (line 627-632), the Personnel tab's `FreelancerFilters` doesn't pass `personnel`, `customPersonnelIds`, `customRoles`, `customWorkerGroupIds`, or `onCustomFilterChange`. Add these props so the "Custom" button appears and opens the dialog.

#### 4. Update `applyCategoryFilter` to resolve worker groups
The existing `applyCategoryFilter` (line 319-328) handles `customFilterPersonnelIds` and `customFilterRoles` but ignores `customFilterWorkerGroupIds`. Update it to accept the worker group IDs and resolve membership using a query (via `usePersonnelGroupFilter` or inline lookup). This requires:
- Adding a second `usePersonnelGroupFilter` call for the personnel-tab custom worker groups
- Passing the resolved IDs into `applyCategoryFilter`

#### 5. Remove `workerGroupFilters` from `PersonnelFilters` popover
Since worker group filtering will now be handled via the Custom toggle, remove the worker group section from the `PersonnelFilters` component (or at least from its usage on the Personnel tab). This consolidates all personnel-scoping into one place.

### Files changed
- `src/pages/AdminDashboard.tsx` — new state, updated `FreelancerFilters` props, updated `applyCategoryFilter`, remove `workerGroupFilters` prop from `PersonnelFilters`
- `src/components/FreelancerFilters.tsx` — remove the guard that blocks `'custom'` on Personnel tab (line 629-631)

