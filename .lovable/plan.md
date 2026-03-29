

## Plan: Replace dot indicator with bottom bar for project days

### File: `src/components/AvailabilityCalendar.tsx`

### 1. Update `DayContentWithDot` (lines 469–490)

Replace the corner dot with a bottom bar. To pick the right bar colour, check if the day has an availability status (coloured fill) by looking up `availability` array:

```tsx
const DayContentWithDot = useCallback((props: DayContentProps) => {
  const isProjectDay = projectBlockDates.some(d => isSameDay(d, props.date));
  const hasColoredFill = availability.some(a => isSameDay(toLocalDate(a.date), props.date));
  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
      {props.date.getDate()}
      {isProjectDay && (
        <span
          style={{
            position: 'absolute',
            bottom: '3px',
            left: '6px',
            right: '6px',
            height: '3px',
            borderRadius: '2px',
            backgroundColor: hasColoredFill ? 'rgba(255,255,255,0.85)' : '#3B3AC2',
          }}
        />
      )}
    </span>
  );
}, [projectBlockDates, availability]);
```

Add `availability` to the dependency array since we now read it for colour logic.

### 2. Update the legend swatch (line 562–565)

Replace the circle dot with a horizontal bar:

```tsx
<div className="flex items-center gap-1.5 text-sm">
  <span style={{ width: '16px', height: '3px', borderRadius: '2px', backgroundColor: '#3B3AC2', display: 'inline-block' }} />
  <span className="text-muted-foreground">Assigned Project</span>
</div>
```

### 3. No other changes
All functionality, fills, events panel, date inputs stay identical.

### Risk
Q5 — purely visual, no backend or permission changes.

