

## Plan: Make shift selector update entire project detail view

### File: `src/components/ProjectDetail.tsx`

### Changes

**1. Derive all display data from `selectedShiftProject` instead of `project`**

Currently, header card, stats, timeline, and chat all use `project` directly. Replace these with `selectedShiftProject` which already resolves to the correct shift (or falls back to `project` for non-grouped).

Specific lines to update:

- **Header name** (line 267): `project.name` → `selectedShiftProject.name`
- **Shift badge** (lines 280-285): `project.shiftNumber` → `selectedShiftProject.shiftNumber`
- **Status badge** (lines 275-278): use `selectedShiftProject.status` for the badge (keep `groupStatus` only for the stats card status, or use selected shift status everywhere — per the request, show the selected shift's status)
- **Start/end dates** (lines 135-137): compute from `selectedShiftProject` instead of `project`:
  ```tsx
  const shiftStart = parseISO(selectedShiftProject.startDate);
  const shiftEnd = selectedShiftProject.endDate ? parseISO(selectedShiftProject.endDate) : null;
  const shiftDuration = shiftEnd ? differenceInDays(shiftEnd, shiftStart) + 1 : null;
  ```
  Use `shiftStart`, `shiftEnd`, `shiftDuration` in the header dates (lines 302-318) and stats cards (lines 394-399).

- **Stats card — status** (line 410): `groupStatus` → `selectedShiftProject.status`

**2. Update Timeline to use selected shift's project ID (line 436-446)**

```tsx
<ProjectTimeline
  project={selectedShiftProject}
  ...
/>
```

**3. Update Chat to use selected shift's project ID (line 453)**

```tsx
<ProjectChat projectId={selectedShiftProject.id} projectName={selectedShiftProject.name} />
```

**4. Update Documents to use selected shift's project ID (line 524)**

```tsx
<ProjectDocuments projectId={selectedShiftProject.id} ... />
```

**5. Keep `project` for structural things that don't change per-shift**
- `project.isPosted`, `project.isRecurring`, `project.rotationOnDays/Off` — these are group-level attributes, keep as-is
- Edit/Share/Close dialogs still operate on `project` (the parent)
- Card background tinting (`project.isRecurring`, `project.isPosted`) — keep as-is

**6. No styling changes to shift selector** — already matches the requested style from previous iteration.

### No changes to
- Non-grouped projects (selectedShiftProject falls back to project)
- Schema/RLS/backend
- Other components

### Risk
Q5 — purely UI display change.

