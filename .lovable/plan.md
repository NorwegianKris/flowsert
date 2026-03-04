

## Unify Personnel Filter Toggle — One Toggle, One Position, Both Tabs

Cosmetic + state consolidation. No schema changes. 🟢

### Summary

Merge the two separate filter states (`personnelTabFilter` for Personnel tab, `complianceFilter` for Overview tab) into one shared state. Extract the toggle group out of both tab contents and place it in the shared stat cards row above the tab bar. Default to `'employees'`.

### Changes

#### 1. `src/pages/AdminDashboard.tsx`

**State**: Remove `personnelTabFilter` (line 120) and `complianceFilter` (line 126). Replace with one shared state:
```tsx
const [personnelFilter, setPersonnelFilter] = useState<'all' | 'employees' | 'freelancers' | 'custom'>('employees');
```

**DashboardStats row** (lines 577-584): Wrap in a flex row with the toggle group on the right. Move the ComplianceSnapshot-style ToggleGroup (All/Employees/Freelancers/Custom) here, extracted from ComplianceSnapshot. Include the Custom toggle + CustomPersonnelFilterDialog logic here (or create a small wrapper component).

```tsx
<div className="flex flex-col sm:flex-row sm:items-start gap-4">
  <div className="flex-1">
    <DashboardStats
      personnel={personnel}  // pass filtered-by-toggle personnel
      needsReviewCount={needsReviewCount}
      onNeedsReviewClick={...}
    />
  </div>
  <FreelancerFilters
    personnelFilter={personnelFilter}
    onPersonnelFilterChange={setPersonnelFilter}
    customPersonnelIds={customFilterPersonnelIds}
    customRoles={customFilterRoles}
    customWorkerGroupIds={customFilterWorkerGroupIds}
    onCustomFilterChange={...}
    personnel={personnel}
  />
</div>
```

**DashboardStats**: Pass pre-filtered personnel so its counts reflect the active toggle. Filter personnel by the shared `personnelFilter` before passing to DashboardStats (and ComplianceSnapshot).

**Personnel tab** (lines 602-618): Remove `FreelancerFilters` from the search row. Make search bar full width (`w-full sm:w-80`). Update `filteredPersonnel` to use `personnelFilter` instead of `personnelTabFilter`.

**Overview tab** (lines 709-722): Remove toggle from ComplianceSnapshot props; it no longer owns the toggle. Pass pre-filtered personnel instead.

#### 2. `src/components/FreelancerFilters.tsx`

Expand to be the single toggle component with Custom support. Add props for custom filter state and the CustomPersonnelFilterDialog (move dialog + logic from ComplianceSnapshot into here). This becomes the one toggle used above the tabs.

Props:
```tsx
interface FreelancerFiltersProps {
  personnelFilter: 'all' | 'employees' | 'freelancers' | 'custom';
  onPersonnelFilterChange: (value: ...) => void;
  // Custom filter props
  personnel: Personnel[];
  customPersonnelIds: string[];
  customRoles: string[];
  customWorkerGroupIds: string[];
  onCustomFilterChange: (ids: string[], roles: string[], groupIds: string[]) => void;
}
```

Render the 4-option ToggleGroup (All/Employees/Freelancers/Custom) + CustomPersonnelFilterDialog.

#### 3. `src/components/ComplianceSnapshot.tsx`

Remove the ToggleGroup and CustomPersonnelFilterDialog entirely. Remove the `personnelFilter`, `onPersonnelFilterChange`, custom filter props. The component now only receives pre-filtered `personnel` and renders the 3 stat cards. Remove the flex wrapper that positioned the toggle; just render the stat cards grid.

#### 4. `src/components/DashboardStats.tsx`

No structural changes needed. It already receives `personnel` as a prop — just ensure the caller passes filtered personnel so counts reflect the toggle.

### Files

| File | Change |
|---|---|
| `AdminDashboard.tsx` | Merge 2 filter states → 1; move toggle above tabs; filter personnel before passing to DashboardStats & ComplianceSnapshot; search bar full width |
| `FreelancerFilters.tsx` | Expand with Custom option + CustomPersonnelFilterDialog |
| `ComplianceSnapshot.tsx` | Strip toggle + custom dialog; receive pre-filtered personnel only |
| `DashboardStats.tsx` | No changes (receives filtered personnel from parent) |

