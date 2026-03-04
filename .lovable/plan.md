

## Revert Toggle Placement — Each Tab Gets Its Own Toggle

Cosmetic only. No schema changes. 🟢

### Changes

#### 1. `src/pages/AdminDashboard.tsx`

**State**: Replace single `personnelFilter` with two independent states:
```tsx
const [personnelTabFilter, setPersonnelTabFilter] = useState<'all' | 'employees' | 'freelancers'>('employees');
const [overviewFilter, setOverviewFilter] = useState<'all' | 'employees' | 'freelancers' | 'custom'>('employees');
```

Keep custom filter state (`customFilterPersonnelIds`, `customFilterRoles`, `customFilterWorkerGroupIds`) — used only by Overview tab's `'custom'` option.

**filteredPersonnel**: Split into two filtered lists or make it dynamic based on active tab. Simpler: compute `personnelTabFiltered` and `overviewFiltered` separately, or keep one `filteredPersonnel` that switches source filter based on `activeTab`. Cleanest approach: use `activeTab === 'overview' ? overviewFilter : personnelTabFilter` as the effective filter in the existing `filteredPersonnel` memo, adding `activeTab` to deps.

**DashboardStats row** (lines 581-605): Remove the `FreelancerFilters` and the flex wrapper. Go back to just:
```tsx
<DashboardStats personnel={filteredPersonnel} ... />
```

**Personnel tab** (lines 623-633): Merge search bar and toggle into one row:
```tsx
<div className="flex items-center gap-4 mb-4">
  <div className="relative flex-1 sm:max-w-80">
    <Search ... /><Input ... />
  </div>
  <FreelancerFilters
    personnelFilter={personnelTabFilter}
    onPersonnelFilterChange={setPersonnelTabFilter}
  />
</div>
```

**Overview tab** (line 724-725): Add toggle inline with ComplianceSnapshot:
```tsx
<div className="flex flex-col sm:flex-row sm:items-start gap-4">
  <div className="flex-1">
    <ComplianceSnapshot personnel={overviewFiltered} />
  </div>
  <FreelancerFilters
    personnelFilter={overviewFilter}
    onPersonnelFilterChange={setOverviewFilter}
    personnel={personnel}
    customPersonnelIds={customFilterPersonnelIds}
    customRoles={customFilterRoles}
    customWorkerGroupIds={customFilterWorkerGroupIds}
    onCustomFilterChange={...}
  />
</div>
```

#### 2. `src/components/FreelancerFilters.tsx`

No changes needed — it already supports both modes. When `onCustomFilterChange` is not provided, it renders without the Custom option (3 items). When provided, it shows all 4 options including Custom + dialog.

#### 3. `src/components/ComplianceSnapshot.tsx` / `DashboardStats.tsx`

No changes — both already receive pre-filtered personnel.

### Files

| File | Change |
|---|---|
| `AdminDashboard.tsx` | Split shared state → 2 independent states; move toggle into each tab; DashboardStats row full width |
| `FreelancerFilters.tsx` | No changes needed |
| `ComplianceSnapshot.tsx` | No changes |
| `DashboardStats.tsx` | No changes |

