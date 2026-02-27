

## Plan: Add recurring project toggle and filter — ✅ IMPLEMENTED

### 1 — Database migration (🔴 anchor required — Q1) ✅
Added `is_recurring`, `recurring_interval_days`, `recurring_interval_label`, `recurring_next_date` to `projects` table.

### 2 — `src/hooks/useProjects.ts` ✅
Updated Project/DbProject interfaces and all mapping logic.

### 3 — `src/components/AddProjectDialog.tsx` ✅
Added recurring toggle with interval definer below "Post project?" toggle.

### 4 — `src/components/ProjectsTab.tsx` ✅
Added "Project View" filter bar with recurring toggle and teal badge on cards.

### Risk
- 🔴 Database schema change (Q1) — anchor required
