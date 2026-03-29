

## Plan: Separate visual bar dates from rotation logic

### File: `src/components/AvailabilityCalendar.tsx`

### Problem
`projectBlockDates` is derived from `getProjectOnPeriodDates` which has complex rotation logic that's generating incorrect dates. The project runs Apr 1–21 but bars appear on every March day.

### Changes

**1. Add a new `projectBarDates` array (after line 140)**

A simple `useMemo` that generates dates purely from `startDate`/`endDate`, ignoring rotation logic entirely:

```typescript
const projectBarDates = useMemo(() => {
  const dates: Date[] = [];
  for (const project of assignedProjects) {
    if (project.status === 'completed') continue;
    if (!project.endDate) continue;
    const start = toLocalDate(project.startDate);
    const end = toLocalDate(project.endDate);
    const days = eachDayOfInterval({ start, end });
    dates.push(...days);
  }
  return dates;
}, [assignedProjects]);
```

**2. Update `DayContentWithDot` (line 472)**

Replace `projectBlockDates` with `projectBarDates`:

```typescript
const isProjectDay = projectBarDates.some(d => isSameDay(d, props.date));
```

Update the dependency array to use `projectBarDates` instead of `projectBlockDates`.

**3. Update debug logging (line 495)**

Log `projectBarDates` count and first 5 dates instead of `projectBlockDates`:

```typescript
console.log('[AvailabilityCalendar] projectBarDates total:', projectBarDates.length, 'first 5:', projectBarDates.slice(0, 5).map(d => format(d, 'yyyy-MM-dd')));
```

**4. No other changes**

`projectBlockDates` and `getProjectOnPeriodDates` stay as-is for any other consumers. The bar indicator is now completely independent of rotation logic.

### Risk
Q5 — purely visual data source change, no backend or permission changes.

