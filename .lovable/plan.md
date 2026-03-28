

## Plan: Three fixes in AvailabilityCalendar.tsx

### File: `src/components/AvailabilityCalendar.tsx`

### 1. Remove tip banner from collapsed view only
- Delete lines 689–693 (the tip banner in the collapsed card view)
- Keep the identical tip banner in the expanded modal (lines 727–731)

### 2. Enhance projectBlockDates debug logging
- In the existing `useEffect` (line 469), add a log that prints each date as a readable string along with the total count, and also log the raw `assignedProjects` array to see which projects are generating dates

### 3. Fix dark navy fill on days 10 and 14 in collapsed view
- The dark fill is caused by `day_selected` class (`bg-primary text-primary-foreground`) from the `selectedRange` state persisting across interactions
- The collapsed calendar uses `selectedRange` (line 698) which retains the previously clicked range even after saving/removing availability
- **Fix**: After saving or removing availability in the collapsed view, clear `selectedRange` (already done on line 429 but only inside the `else` branch — verify this is firing). Also initialize `selectedRange` to `undefined` and ensure the `day_selected` class in `calendarClassNames` does not produce a dark navy fill for range endpoints
- Most likely root cause: the `day_range_start` and `day_range_end` classes are not defined in `calendarClassNames`, so DayPicker falls back to its built-in dark styles. **Add `day_range_start` and `day_range_end` entries** to `calendarClassNames` with transparent or primary-colored styling that matches the design, or add `day_range_middle` to control the in-between fill

### Technical details
- `calendarClassNames` (line 480) is missing `day_range_end`, `day_range_start`, and `day_range_middle` — DayPicker's default stylesheet applies its own dark background for these
- Add these keys to `calendarClassNames`:
  ```
  day_range_start: "bg-primary text-primary-foreground rounded-full"
  day_range_end: "bg-primary text-primary-foreground rounded-full"  
  day_range_middle: "bg-accent text-accent-foreground"
  ```
- Same entries should be added to `expandedCalendarClassNames` (inherited via spread, so only need to add to `calendarClassNames`)

### Risk
Q5 — purely UI, no backend or permission changes.

