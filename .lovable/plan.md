

## Add Role & Worker Group Filters to Export Sharing Dialogs

### Problem
The External Sharing dialog (admin dashboard) and Share Project dialog (project view) currently only allow filtering personnel by Employee/Freelancer. The user wants to filter by **job roles** (worker categories) and **worker groups** — the same filters available in the dashboard's Workers popover.

### Changes

#### 1. ExternalSharingDialog.tsx
- Import `useWorkerGroups` and `useWorkerCategories` hooks
- Add state for `selectedRoleFilters: string[]` and `selectedWorkerGroupFilters: string[]`
- Replace the current "Select by group" section (Employee/Freelancer buttons) with a richer filter section containing three parts:
  - **Personnel type**: Employee / Freelancer toggles (existing behavior, kept)
  - **Roles**: List of business worker categories as checkable buttons (from `useWorkerCategories`)
  - **Worker Groups**: List of business worker groups as checkable buttons (from `useWorkerGroups`)
- Update `getSelectedPersonnel()` to also filter by selected roles (`p.role` matching selected worker category names) and worker groups (using `usePersonnelWorkerGroups` data to resolve which personnel belong to selected groups)
- Import `usePersonnelWorkerGroups` to resolve group membership
- Clear new filter state in `handleClose()`

#### 2. ShareProjectDialog.tsx
- Add the same role and worker group filter options to the personnel selection area
- Currently this dialog shows assigned personnel for the project — add optional role/group sub-filtering so the user can narrow down which assigned personnel appear in the export
- Import the same hooks (`useWorkerGroups`, `useWorkerCategories`, `usePersonnelWorkerGroups`)

### UI Layout (within the personnel selection section)
```text
Select by group:
 [Employees] [Freelancers]       ← existing

Filter by role:                   ← new
 [Diver] [Welder] [Supervisor]... ← from worker categories

Filter by worker group:           ← new
 [Team A] [Team B] ...            ← from worker_groups table
```

### Technical Notes
- No database or RLS changes — purely UI-level, reads from existing hooks
- The `role` field on personnel matches worker category names
- Worker group membership resolved via `personnel_worker_groups` junction table (already queried by `usePersonnelWorkerGroups`)
- Filters combine with AND logic: personnel must match ALL active filter dimensions
- When no filters are selected in a dimension, that dimension is ignored (pass-through)

