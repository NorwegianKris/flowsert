

## Worker Groups: Full Feature + Admin Filter (Final Corrected Plan)

This plan implements the Worker Groups management system (Settings > Categories) and the Worker Groups filter (Admin Dashboard). All prior corrections plus the two new ones are incorporated.

### Phase 1: Database Migration

**Table: `worker_groups`**
- id (uuid, PK, default gen_random_uuid())
- business_id (uuid, NOT NULL, FK to businesses)
- name (text, NOT NULL)
- created_at (timestamptz, default now())
- updated_at (timestamptz, default now())
- UNIQUE constraint on (business_id, name)
- Reuse existing `update_updated_at_column()` trigger

**Table: `personnel_worker_groups`** (no surrogate id)
- personnel_id (uuid, FK to personnel ON DELETE CASCADE)
- worker_group_id (uuid, FK to worker_groups ON DELETE CASCADE)
- PRIMARY KEY (personnel_id, worker_group_id)
- created_at (timestamptz, default now())

**Indexes:**
```text
worker_groups_business_id_idx ON worker_groups (business_id)
personnel_worker_groups_worker_group_id_idx ON personnel_worker_groups (worker_group_id)
personnel_worker_groups_personnel_id_idx ON personnel_worker_groups (personnel_id)
```

**RLS -- Admin-only, NO `FOR ALL` policies:**

`worker_groups`:
- FOR SELECT: `business_id = get_user_business_id(auth.uid()) AND has_role(auth.uid(), 'admin')`
- FOR INSERT: with_check same
- FOR UPDATE: using same
- FOR DELETE: using same

`personnel_worker_groups`:
- FOR SELECT: `EXISTS (SELECT 1 FROM worker_groups wg WHERE wg.id = personnel_worker_groups.worker_group_id AND wg.business_id = get_user_business_id(auth.uid()) AND has_role(auth.uid(), 'admin'))`
- FOR INSERT (with_check): `EXISTS (SELECT 1 FROM worker_groups wg WHERE wg.id = personnel_worker_groups.worker_group_id AND wg.business_id = get_user_business_id(auth.uid()) AND has_role(auth.uid(), 'admin'))`
- FOR DELETE: same EXISTS condition using `personnel_worker_groups.worker_group_id`

Note: The INSERT with_check references `personnel_worker_groups.worker_group_id` which maps to `NEW.worker_group_id` under the hood. No UPDATE policy needed on the junction table.

---

### Phase 2: Categories Section Changes

**`src/components/CategoriesSection.tsx`**
- Rename the top-level tab value/label from "Roles" to "Workers" (lines 24-29)
- Inside the Workers tab content (lines 44-51), add sub-tabs matching the Certificates pattern (lines 63-102):
  - "Roles" (default) -- renders existing `WorkerCategoriesManager`
  - "Worker Groups" -- renders new `WorkerGroupsManager`

---

### Phase 3: Worker Groups Management Components

**New: `src/components/WorkerGroupsManager.tsx`**
- Mirrors `IssuerTypesManager` structure: a `Tabs` with two sub-views
  - "Group Workers" (default) -- renders `WorkerGroupMergingPane`
  - "Manage Groups" -- renders `WorkerGroupsManageList`

**New: `src/components/WorkerGroupMergingPane.tsx`**
- Two-pane layout mirroring `IssuerMergingPane` (lines 338-340: grid cols layout)
- Left panel: personnel list with search, "Show grouped" toggle, checkboxes (name + role + group badges)
- Right panel: worker groups with search, group name + member count (from aggregated query), single-select
- Center: assign arrow button
- **Member counts**: single aggregated query `SELECT worker_group_id, count(*) FROM personnel_worker_groups GROUP BY worker_group_id` -- no N+1
- **Empty state**: if 0 groups, show "No groups yet -- create your first group in Manage Groups"

**New: `src/components/WorkerGroupsManageList.tsx`**
- Mirrors existing category CRUD pattern (see CertificateCategoriesInner, lines 176-326)
- Add input + button, list with rename/delete, member count per group
- **Empty state**: if 0 groups, show friendly message with add input auto-focused ("Create your first group")
- Delete cascades via FK

---

### Phase 4: Data Hooks

**New: `src/hooks/useWorkerGroups.ts`**
- `useWorkerGroups()`: fetches `worker_groups` for current business
- `useCreateWorkerGroup()`, `useUpdateWorkerGroup()`, `useDeleteWorkerGroup()`: mutations
- `useWorkerGroupMemberCounts()`: single aggregated query returning `{ worker_group_id, count }[]`

**New: `src/hooks/usePersonnelWorkerGroups.ts`**
- `usePersonnelWorkerGroups()`: fetches all junction rows
- `useAssignPersonnelToGroup()`: insert mutation
- `useUnassignPersonnelFromGroup()`: delete mutation

**New: `src/hooks/usePersonnelGroupFilter.ts`**
- Input: `selectedGroupIds: string[]`, `includeUngrouped: boolean`, `allPersonnelIds: string[]`
- Query 1 (enabled: `selectedGroupIds.length > 0`): junction table filtered by selected group IDs, returns distinct personnel_ids
- Query 2 (enabled: `includeUngrouped === true`): `SELECT DISTINCT personnel_id FROM personnel_worker_groups`, returns all grouped IDs
- Client-side: `ungroupedIds = allPersonnelIds - allGroupedPersonnelIds` (Set subtraction)
- Output: `{ personnelIdFilter: string[] | null, isLoading }` (null = inactive, [] = active but empty)

---

### Phase 5: Admin Dashboard Filter

**Modified: `src/components/PersonnelFilters.tsx`**
- Add optional props: `workerGroups`, `workerGroupFilters`, `onWorkerGroupFiltersChange`, `includeUngrouped`, `onIncludeUngroupedChange`
- New Popover dropdown (Users icon, label "Worker groups"):
  - If groups exist: multi-select checkbox list + divider + "Include ungrouped" checkbox + Clear button
  - If no groups exist: show "No groups yet" text + still render "Include ungrouped" checkbox (functional -- shows ungrouped-only cleanup mode)
- **Always renders for admins** (when `workerGroups` prop is provided, even if empty)
- Integrated into `hasActiveFilters` and `clearAllFilters`
- Active filter badges

**Modified: `src/pages/AdminDashboard.tsx`**
- New state: `workerGroupFilters: string[]`, `includeUngrouped: boolean`
- Import `useWorkerGroups` for groups list
- Import `usePersonnelGroupFilter(workerGroupFilters, includeUngrouped, allPersonnelIds)`
- In `filteredPersonnel` useMemo (line 216): if `personnelIdFilter !== null`, filter with `Set.has()` for O(1)
- Ghost group pruning: `useEffect` auto-removes stale IDs from `workerGroupFilters`
- Pass new props to `PersonnelFilters` (around line 497)
- Update empty state condition (line 544) to include `workerGroupFilters.length > 0 || includeUngrouped`

### Filter Semantics

| Groups selected | Ungrouped checked | Result |
|----------------|-------------------|--------|
| No | No | null (inactive, show all) |
| No | Yes | ungroupedIds only (cleanup mode) |
| Yes | No | groupMatchIds (OR logic) |
| Yes | Yes | groupMatchIds UNION ungroupedIds |

---

### File Summary

| File | Action |
|------|--------|
| Migration SQL | New tables, indexes, admin-only RLS (no FOR ALL) |
| `src/components/CategoriesSection.tsx` | Rename "Roles" to "Workers", add sub-tabs |
| `src/components/WorkerGroupsManager.tsx` | New |
| `src/components/WorkerGroupMergingPane.tsx` | New |
| `src/components/WorkerGroupsManageList.tsx` | New |
| `src/hooks/useWorkerGroups.ts` | New |
| `src/hooks/usePersonnelWorkerGroups.ts` | New |
| `src/hooks/usePersonnelGroupFilter.ts` | New |
| `src/components/PersonnelFilters.tsx` | Modified -- add Worker Groups dropdown |
| `src/pages/AdminDashboard.tsx` | Modified -- add filter state, hooks, ghost pruning |

### Security Summary

- Both tables have RLS enabled
- NO `FOR ALL` policies
- All operations admin-only, business-scoped via `get_user_business_id(auth.uid())`
- Junction table INSERT with_check correctly references `personnel_worker_groups.worker_group_id` (resolves to NEW)
- Workers cannot SELECT from either table
- Composite PK (personnel_id, worker_group_id) prevents duplicates
- CASCADE deletes on both FKs

