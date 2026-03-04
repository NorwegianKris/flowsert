

## Disconnect Stat Cards from Tab Toggles

Purely cosmetic / data-flow change. No schema, RLS, or backend changes. 🟢

### Problem
`DashboardStats` on line 604 of `AdminDashboard.tsx` receives `filteredPersonnel`, which is already filtered by the active tab toggle (Employees/Freelancers/All/Custom). This causes the stat card totals to change when a toggle is selected.

### Fix

**`src/pages/AdminDashboard.tsx`** — one line change:
- Change `<DashboardStats personnel={filteredPersonnel} ...>` to `<DashboardStats personnel={personnel} ...>`, where `personnel` is the raw, unfiltered array from `usePersonnel()`. This ensures the cards always show business-wide totals regardless of which toggle or filter is active on either tab.

