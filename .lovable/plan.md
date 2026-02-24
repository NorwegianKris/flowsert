

## Unify External Sharing PDF with Project View Export + Add Project Toggle

**Risk: GREEN** -- Client-side PDF generation and UI only. No database, RLS, auth, or backend changes.

### Single file: `src/components/ExternalSharingDialog.tsx`

---

### Problem

The `ExternalSharingDialog` (Admin Dashboard > Actions > External Sharing) has its own `generateProjectCardPdf` function (lines 138-291) that uses the **old template**: portrait orientation, blue striped headers, basic layout. This does not match the standardized design system used in `ShareProjectDialog` (landscape, grid theme, gray headers, multi-section layout with phases/milestones/events/matrix).

### Two Changes

#### 1. Replace the old PDF generator with the standardized one

Delete the local `generateProjectCardPdf` function (lines 138-291) and replace it with the same implementation from `ShareProjectDialog.tsx`. This means the ExternalSharingDialog will need to:

- Fetch project phases for the selected project (using the `useProjectPhases` hook or a direct query)
- Use the same landscape orientation, header, table config, section layout (description, phases, milestones, events, personnel with compliance, inline competence matrix, legend), and footer

Since `ShareProjectDialog` receives `phases` as a prop from the project detail view, the `ExternalSharingDialog` will need to fetch phases on-demand when a project is selected. This will be done with a direct Supabase query inside the component (fetch `project_phases` where `project_id` matches the selected project).

#### 2. Add Active/Previous toggle to project selector

Currently the project dropdown (lines 483-498) shows all projects in a flat list. Add a toggle similar to what `ProjectsTab` already uses, allowing the user to switch between:

- **Active and Upcoming** (status = 'active' or 'pending') -- shown by default
- **Previous** (status = 'completed')

Implementation: Add a small toggle or segmented control above the project Select dropdown. Filter the projects list based on the selected category.

---

### Technical Details

**Phases fetching**: When `selectedProjectId` changes, fetch phases from `project_phases` table:
```typescript
const [projectPhases, setProjectPhases] = useState<ProjectPhase[]>([]);

useEffect(() => {
  if (!selectedProjectId) { setProjectPhases([]); return; }
  supabase.from('project_phases').select('*')
    .eq('project_id', selectedProjectId)
    .order('start_date')
    .then(({ data }) => setProjectPhases(data || []));
}, [selectedProjectId]);
```

**Project category toggle**: A simple state variable (`projectFilter: 'active' | 'previous'`) with two small buttons or a segmented control, defaulting to `'active'`. Active shows projects with status `active` or `pending`, Previous shows `completed`.

**PDF generation**: Copy the `generateProjectCardPdf` function body from `ShareProjectDialog.tsx` (lines 66-500+), adapting it to accept the project as a parameter (since ExternalSharingDialog doesn't have a single fixed project). The function signature becomes `generateProjectCardPdf(project: Project, phases: ProjectPhase[])`.

All other export options (Personnel and Certificates Matrix, Certificate Bundle) remain unchanged -- they already use the shared utility functions.

---

### Summary

| What | Before | After |
|------|--------|-------|
| Project Card PDF template | Old (portrait, blue striped, basic) | Standardized (landscape, grid, full sections) |
| Project selector | Flat list of all projects | Toggle between Active/Upcoming and Previous |
| Phases in PDF | Not included | Fetched and included (matching project view export) |
| Other exports | Unchanged | Unchanged |

