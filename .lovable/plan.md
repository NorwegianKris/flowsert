

## Plan: Scope projectBarDates to visible month and add per-project debug logging

### File: `src/components/AvailabilityCalendar.tsx`

### Finding

The bars appearing on every March day is **not a bug** — three active/pending projects collectively cover all 31 March days. The 324-date `projectBarDates` array is correct but wasteful since most dates are outside the visible month.

### Changes

**1. Add `visibleMonth` state tracking** (near line 128)

The collapsed calendar already shows one month. Track which month is displayed so we can scope dates:

```typescript
const [visibleMonth, setVisibleMonth] = useState<Date>(new Date());
```

Pass `onMonthChange={setVisibleMonth}` to both DayPicker instances (collapsed and expanded).

**2. Scope `projectBarDates` to visible month** (lines 143–153)

Only generate dates that fall within the visible month boundaries, drastically reducing the array size and `.some()` cost:

```typescript
const projectBarDates = useMemo(() => {
  const monthStart = startOfMonth(visibleMonth);
  const monthEnd = endOfMonth(visibleMonth);
  const dates: Date[] = [];
  for (const project of assignedProjects) {
    if (project.status === 'completed') continue;
    if (!project.endDate) continue;
    const start = toLocalDate(project.startDate);
    const end = toLocalDate(project.endDate);
    // Clamp to visible month
    const clampedStart = start < monthStart ? monthStart : start;
    const clampedEnd = end > monthEnd ? monthEnd : end;
    if (clampedStart > clampedEnd) continue;
    dates.push(...eachDayOfInterval({ start: clampedStart, end: clampedEnd }));
  }
  return dates;
}, [assignedProjects, visibleMonth]);
```

**3. Enhanced per-project debug logging** (lines 508–511)

Show per-project contribution to the bar dates for the visible month:

```typescript
console.log('[AvailabilityCalendar] visibleMonth:', format(visibleMonth, 'yyyy-MM'));
console.log('[AvailabilityCalendar] projectBarDates (this month):', projectBarDates.length);
assignedProjects.forEach(p => {
  const start = p.startDate;
  const end = p.endDate ?? 'NONE';
  console.log(`  [Project] "${p.name}" | ${start} → ${end} | status: ${p.status}`);
});
```

**4. Pass `onMonthChange` to both Calendar components**

Add `onMonthChange={setVisibleMonth}` prop to the collapsed `<Calendar>` and the expanded modal `<Calendar>`.

### Result

- Bars still appear on every March day (correct — 3 projects cover all of March)
- `projectBarDates` shrinks from 324 to ~31 entries (only visible month)
- Debug logs clearly show per-project date ranges so you can verify the data
- Performance improvement from smaller `.some()` comparisons

### Risk
Q5 — purely visual/performance, no backend or permission changes.

