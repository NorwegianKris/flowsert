

## Plan: Fix projectBlockDates over-generation

### File: `src/components/AvailabilityCalendar.tsx`

### Root cause

In `getProjectOnPeriodDates` (line 91), `maxRotations` defaults to 52 when `rotationCount` is falsy. If a rotation project lacks an end date, the loop runs 52 cycles unclamped (line 98: `if (endDate && periodStart > endDate) break` — never breaks when endDate is null). This floods `projectBlockDates` with hundreds of dates.

### Changes

**1. Enhanced debug logging (lines 492–500)**

Replace current logging with detailed per-project output:

```typescript
console.log('[AvailabilityCalendar] projectBlockDates total:', projectBlockDates.length);
assignedProjects.forEach(p => {
  const dates = getProjectOnPeriodDates(p);
  console.log(`[Project] "${p.name}" | start: ${p.startDate} | end: ${p.endDate ?? 'NONE'} | status: ${p.status} | rotationOn: ${p.rotationOnDays} | rotationOff: ${p.rotationOffDays} | rotationCount: ${p.rotationCount} | generated dates: ${dates.length}`);
});
```

**2. Fix `getProjectOnPeriodDates` (lines 79–116)**

Three guard fixes:

- **Rotation projects without end date**: If `onDays && offDays` are set but `endDate` is null AND `rotationCount` is null/0, return empty — we can't safely generate dates without a boundary.
- **Cap maxRotations**: Change `project.rotationCount || 52` to `project.rotationCount || 1` — if no explicit count, assume a single cycle.
- **Non-rotation projects without end date**: Already handled (line 108 returns early). No change needed.

Updated function:
```typescript
function getProjectOnPeriodDates(project: AssignedProjectWithRotation): ProjectOnPeriod[] {
  const startDate = toLocalDate(project.startDate);
  const endDate = project.endDate ? toLocalDate(project.endDate) : null;
  const results: ProjectOnPeriod[] = [];

  if (project.status === 'completed') return results;

  const onDays = project.rotationOnDays;
  const offDays = project.rotationOffDays;

  if (onDays && offDays && onDays > 0 && offDays > 0) {
    // Rotation project: need either an end date or explicit rotation count
    const maxRotations = project.rotationCount && project.rotationCount > 0
      ? project.rotationCount
      : (endDate ? 999 : 1); // If no count and no end date, only generate 1 cycle
    let currentStart = startDate;

    for (let i = 0; i < maxRotations; i++) {
      const periodStart = currentStart;
      const periodEnd = addDays(periodStart, onDays - 1);
      const clampedEnd = endDate && periodEnd > endDate ? endDate : periodEnd;
      if (endDate && periodStart > endDate) break;

      const days = eachDayOfInterval({ start: periodStart, end: clampedEnd });
      for (const day of days) {
        results.push({ date: day, project, periodStart, periodEnd: clampedEnd });
      }

      currentStart = addDays(periodStart, onDays + offDays);
    }
  } else {
    // Non-rotation: require end date
    if (!endDate) return results;
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    for (const day of days) {
      results.push({ date: day, project, periodStart: startDate, periodEnd: endDate });
    }
  }

  return results;
}
```

**3. No other changes** — styling, bar indicator, legend, interactions all stay identical.

### Risk
Q5 — logic fix scoped to date calculation, no backend/auth/schema changes.

