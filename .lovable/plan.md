

## Plan: Add shift-aware status and shift selector to project detail view

### File: `src/components/ProjectDetail.tsx`

### Changes

**1. Load sibling shifts for grouped projects**

Add a `useMemo` that filters `allProjects` by `project.shiftGroupId` to get all siblings sorted by `shiftNumber`. This data is already available via the `allProjects` prop — no new queries needed.

**2. Compute group-aware status**

Add a `useMemo` that checks if any sibling has `status === 'active'`. If so, use `'active'` for the status badge and stats card. Otherwise fall back to the parent's status. Only applies when `shiftGroupId` is set.

Update the status badge (line ~240) and the stats card (line ~370) to use this computed status instead of `project.status`.

**3. Add shift selector tab bar below the project header card**

After the header card (line ~320), render a horizontal tab bar when siblings exist (>1 shift). Each tab shows `Shift N` with its date range (e.g. `Apr 1 – Apr 21`). Style matches the existing shift siblings navigation but as a proper selector bar.

Default the selected shift to:
- The shift where today falls within `startDate`–`endDate`, or
- Shift 1 if none is active today

Store selected shift in `useState<string>` (project ID of the selected shift).

**4. Filter personnel panel by selected shift**

Replace `assignedPersonnel` in the Personnel tab (lines ~436-480) with a computed list based on the selected shift. When a shift is selected, show only the personnel assigned to that shift project. For non-grouped projects, behaviour is unchanged.

The `assignedPersonnel` derivation (line ~87) becomes:

```tsx
const selectedShiftProject = useMemo(() => {
  if (!siblings || siblings.length <= 1) return project;
  return siblings.find(s => s.id === selectedShiftId) || project;
}, [siblings, selectedShiftId, project]);

const assignedPersonnel = selectedShiftProject.assignedPersonnel
  .map((id) => personnel.find((p) => p.id === id))
  .filter((p): p is Personnel => p !== undefined);
```

**5. No changes to**
- Timeline, chat, documents, calendar items
- Non-grouped project rendering
- Data/schema/RLS
- Any other components

### Risk
Q5 — purely UI display change.

