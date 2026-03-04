

## Adjustments to the Approved Plan

Two tweaks to the previously approved UI unification plan. Cosmetic only. No schema changes. 🟢

### 1. Default filter to `'all'`

In `src/pages/AdminDashboard.tsx`, when replacing the three booleans with the single `personnelTabFilter` state, default it to `'all'` instead of `'employees'`.

```tsx
const [personnelTabFilter, setPersonnelTabFilter] = useState<'all' | 'employees' | 'freelancers'>('all');
```

### 2. Toggle position: right-aligned at stat-card level

Both tabs must place their toggle group in the same position — right-aligned, on the same row as the stat cards.

**Personnel tab** (`FreelancerFilters` rewrite): Instead of rendering the toggle in its own `mb-4` div between the search bar and AI search, render it **on the same row as the DashboardStats cards** — a flex row with stats on the left and toggle on the right, mirroring the ComplianceSnapshot layout exactly.

Since DashboardStats is currently rendered *above* the Tabs (shared), to get the Personnel toggle at the same vertical level we have two options:

- **Option chosen**: Move the toggle group *into* DashboardStats as an optional slot/prop, so when the Personnel tab is active the toggle appears right-aligned in the stats row. Or simpler: place the toggle in the Personnel tab content but visually align it by wrapping both DashboardStats and the tab content's toggle in a shared flex row.

**Concrete approach**: In the Personnel `TabsContent`, add the new ToggleGroup as a `flex justify-end` element immediately after the search bar (before the card grid), matching the ComplianceSnapshot pattern where the toggle sits `shrink-0` on the right of a flex row. The FreelancerFilters component becomes just the ToggleGroup with the same classes used in ComplianceSnapshot:

```tsx
<ToggleGroup className="bg-primary p-1 rounded-lg shrink-0" ...>
```

For the **Overview tab**, ComplianceSnapshot already has the toggle right-aligned in the stat card row — no change needed there.

### Files affected (same 4 as approved plan)

| File | Additional change |
|---|---|
| `AdminDashboard.tsx` | Default `'all'`; position toggle right-aligned at stat level |
| `FreelancerFilters.tsx` | Render as inline ToggleGroup (no wrapper card) |
| `ComplianceSnapshot.tsx` | No change from approved plan |
| `DashboardStats.tsx` | No change from approved plan |

