

## Add "Worker Groups" Tab to Custom Filter Dialog (Overview)

**Classification: GREEN -- UI-only change. No schema, RLS, or migration changes.**

### Summary

Add a third tab called "Worker Groups" to the Custom Personnel Filter dialog (opened from the Overview tab's "Custom" toggle). This tab will show the admin-defined worker groups (same data used in the Personnel dashboard filter), allowing admins to filter the compliance snapshot and expiry timeline by worker group membership.

### Changes

**1. `src/components/CustomPersonnelFilterDialog.tsx`**

- Add a `selectedWorkerGroupIds: string[]` prop and include it in the `onApply` callback signature: `onApply(personnelIds, roles, workerGroupIds)`
- Add local state `localWorkerGroupIds` for the worker groups tab
- Import and call `useWorkerGroups()` and `useWorkerGroupMemberCounts()` to fetch group names and member counts
- Add a third tab "Worker Groups" (with a `FolderOpen` or `Tag` icon) to the existing `TabsList` (change from `grid-cols-2` to `grid-cols-3`)
- The tab content lists each worker group as a checkbox row with the group name and member count badge (same pattern as the Roles tab)
- Update `totalSelected` to include `localWorkerGroupIds.length`
- Update `handleClear` to also clear worker group selections
- Update `handleOpenChange` to reset worker group state

**2. `src/components/ComplianceSnapshot.tsx`**

- Add `customWorkerGroupIds?: string[]` prop
- Add `onCustomFilterChange` signature update to include worker group IDs: `(personnelIds, roles, workerGroupIds) => void`
- Pass `customWorkerGroupIds` to the dialog and receive it back from `onApply`
- Update the `filteredPersonnel` logic for `'custom'` mode:
  - If worker group IDs are selected, resolve which personnel belong to those groups using the `usePersonnelWorkerGroups()` hook
  - OR-combine with individual and role selections (personnel matches if in any selected group, OR matches a selected role, OR is individually selected)
- Update `customSelectionCount` to include worker group count

**3. `src/pages/AdminDashboard.tsx`**

- Add state: `const [customFilterWorkerGroupIds, setCustomFilterWorkerGroupIds] = useState<string[]>([])`
- Pass `customWorkerGroupIds={customFilterWorkerGroupIds}` to `ComplianceSnapshot`
- Update the `onCustomFilterChange` callback to also set worker group IDs
- Pass `customWorkerGroupIds` to `ExpiryTimeline` as well

**4. `src/components/ExpiryTimeline.tsx`**

- Add `customWorkerGroupIds?: string[]` prop
- Update `filteredPersonnel` logic for `'custom'` mode to also include personnel from selected worker groups (same OR logic as ComplianceSnapshot)
- Import `usePersonnelWorkerGroups` to resolve group membership

### Technical Details

- Worker group membership resolution uses the existing `usePersonnelWorkerGroups()` hook which returns all `(personnel_id, worker_group_id)` junction rows for the business
- Filtering logic: for each personnel, check if their ID appears in any junction row where the `worker_group_id` is in the selected set
- No new database queries or tables needed -- reuses existing hooks and data
- No schema, RLS, or migration changes

### Data Flow

1. Admin opens Overview tab, clicks "Custom" toggle, dialog opens
2. Admin switches to "Worker Groups" tab, selects one or more groups
3. On "Apply", the selected group IDs flow up to AdminDashboard state
4. ComplianceSnapshot and ExpiryTimeline both resolve group membership client-side and OR-combine with individual/role selections

