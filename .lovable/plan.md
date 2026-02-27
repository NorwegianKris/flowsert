

## Plan: Add recurring project toggle and filter

### 1 — Database migration (🔴 anchor required — Q1)

```sql
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS recurring_interval_days INTEGER,
  ADD COLUMN IF NOT EXISTS recurring_interval_label TEXT,
  ADD COLUMN IF NOT EXISTS recurring_next_date TIMESTAMPTZ;
```

### 2 — `src/hooks/useProjects.ts`

**Project interface** (after line 33): add `isRecurring`, `recurringIntervalDays`, `recurringIntervalLabel`, `recurringNextDate`

**DbProject interface** (after line 58): add `is_recurring`, `recurring_interval_days`, `recurring_interval_label`, `recurring_next_date`

**fetchProjects mapping** (after line 206): map all four fields

**addProject insert** (after line 260): include all four fields with conditional null logic

**addProject response mapping** (after line 286): map all four fields

**updateProject** (after line 333): include all four fields

**resetForm** already handled in AddProjectDialog

### 3 — `src/components/AddProjectDialog.tsx`

**State** (after line 73): add `isRecurring`, `recurringIntervalDays`, `recurringIntervalLabel`, `customInterval`

**Import**: add `Repeat` to lucide-react imports (line 17)

**After line 770** (after the `ProjectVisibilityControls` closing block, before `</div>`): insert the recurring project toggle block with chips (7/14/21/28 days) and custom input — exact JSX from user's prompt

**resetForm** (around line 263): add four reset calls

**handleSubmit newProject object** (around line 184): add `isRecurring`, `recurringIntervalDays`, `recurringIntervalLabel`, `recurringNextDate`

### 4 — `src/components/ProjectsTab.tsx`

**Import**: add `Repeat` to lucide-react imports (line 9)

**State** (after line 28): add `const [includeRecurring, setIncludeRecurring] = useState(true);`

**Counts** (after line 37): add `const recurringProjectsCount = projects.filter(p => p.isRecurring).length;`

**Filter logic** (line 31-33): extend to also filter recurring when toggled off

**Filter bar** (lines 53-71): retitle to "Project View", always show when either posted or recurring projects exist, add second toggle for "Show recurring projects" with Repeat icon and count badge

**ProjectCard** (around line 178-188): add recurring badge (teal) alongside existing posted/status badge when `project.isRecurring`, showing interval label

### Risk
- 🔴 Database schema change (Q1) — anchor required

