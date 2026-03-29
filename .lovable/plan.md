

## Plan: Group back-to-back shift projects into a single card

### File: `src/components/ProjectsTab.tsx`

### Changes

**1. Replace per-shift card rendering with grouped card (lines 156-168)**

Instead of `shiftGroups.flatMap(group => group.projects.map(...))`, render one card per group. Find the parent project (`isShiftParent === true`, fallback to first by `shiftNumber`). Click opens parent project.

```tsx
{shiftGroups.map(group => {
  const parent = group.projects.find(p => p.isShiftParent) || group.projects[0];
  return (
    <ProjectCard
      key={group.groupId}
      project={parent}
      personnel={personnel}
      getPersonnelById={getPersonnelById}
      getInitials={getInitials}
      onClick={() => onSelectProject(parent)}
      groupColor={group.color}
      shiftGroup={group.projects}
    />
  );
})}
```

**2. Add `shiftGroup` prop to `ProjectCard` (line 230+)**

Add optional `shiftGroup?: Project[]` to `ProjectCardProps`.

**3. Modify `ProjectCard` display when `shiftGroup` is provided**

- **Name**: Strip ` — Shift 1` suffix from display name using regex: `project.name.replace(/\s*—\s*Shift\s*\d+$/i, '')`
- **Shift count pill**: Replace the individual "Shift N" badge with a `"{N} shifts"` pill using Layers icon, styled with `groupColor` or teal fallback
- **Date range**: Show `shiftGroup[0].startDate` to `shiftGroup[shiftGroup.length - 1].endDate` (last shift's end date)
- **Personnel count**: Aggregate `assignedPersonnel` across all shifts using a `Set` to deduplicate: `new Set(shiftGroup.flatMap(p => p.assignedPersonnel))`
- **Rotation badges**: Keep showing from parent project (unchanged)

**4. No changes to**
- Data/schema/RLS
- Project creation logic
- Non-grouped project rendering
- Project detail view

### Risk
Q5 — purely UI display change.

