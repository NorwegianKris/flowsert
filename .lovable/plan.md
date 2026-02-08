
# Fix Overdue Certificate Visibility on Event Timeline

## Problem
The "Overdue" card shows 14 expired certificates, but only 6 red dots are visible on the timeline. This is because:
1. The timeline only extends 30 days into the past
2. Certificates expired more than 30 days ago are clamped to the left edge (0% position) and stack on top of each other
3. There's no way to "zoom backwards" to see older expired certificates

## Solution
Add a **Past Range Control** that allows admins to extend how far back in time the timeline shows, similar to how the future zoom works. This will spread out the overdue certificates so all 14 become visible as individual dots.

---

## User Experience

### Updated Controls Layout
```text
Left side:                                          Right side:
[Past: 30d ▾] [3m] [6m] [1y] [2y] | [===o===] 90d   [Category ▾] [Type ▾] [↺]
```

### Past Range Dropdown Options
| Option | Days Back | Use Case |
|--------|-----------|----------|
| 30 days | -30 | Default view |
| 90 days | -90 | See 3 months of overdue |
| 6 months | -180 | See half year of overdue |
| 1 year | -365 | See full year of overdue |

### Visual Behavior
- When past range is extended, the "Overdue" lane stretches to accommodate more time
- All overdue certificates spread out proportionally instead of stacking
- Time axis adds markers for past dates (e.g., -30d, -60d, -90d)
- "Today" marker remains as the reference point

---

## Technical Changes

### 1. Add `timelineStartDays` State (`src/components/ExpiryTimeline.tsx`)

Add a new state variable alongside the existing `timelineEndDays`:
```text
State:
- timelineStartDays: number (default: -30, options: -30, -90, -180, -365)
```

Pass both values to the TimelineChart and ZoomControls.

### 2. Update TimelineZoomControls (`src/components/timeline/TimelineZoomControls.tsx`)

Add a dropdown for past range selection:

| Component | Description |
|-----------|-------------|
| Select dropdown | "Past: 30d", "Past: 90d", "Past: 6mo", "Past: 1y" |
| Position | Left side, before the preset buttons |

Props interface updated:
- `timelineStartDays: number`
- `onTimelineStartDaysChange: (days: number) => void`

Reset button clears both past and future ranges.

### 3. Update TimelineChart (`src/components/timeline/TimelineChart.tsx`)

Dynamic calculations based on both ranges:
- Accept `timelineStartDays` prop (negative value, e.g., -90)
- Calculate `totalDays = timelineEndDays - timelineStartDays`
- Update event positioning: `daysFromStart = differenceInDays(event.expiryDate, subDays(today, Math.abs(timelineStartDays)))`
- Add past time axis labels (e.g., -30d, -60d, -90d) when zoomed back

### 4. Update types.ts if needed

No changes required - the overdue lane already handles negative `daysUntilExpiry` values correctly.

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `src/components/ExpiryTimeline.tsx` | Modify | Add `timelineStartDays` state, pass to child components |
| `src/components/timeline/TimelineZoomControls.tsx` | Modify | Add past range dropdown selector |
| `src/components/timeline/TimelineChart.tsx` | Modify | Accept dynamic start days, update positioning and axis labels |

---

## Implementation Details

### Past Range Select Component
```text
<Select value={timelineStartDays}>
  <SelectItem value={-30}>Past: 30d</SelectItem>
  <SelectItem value={-90}>Past: 90d</SelectItem>
  <SelectItem value={-180}>Past: 6mo</SelectItem>
  <SelectItem value={-365}>Past: 1y</SelectItem>
</Select>
```

### Updated Position Calculation
```text
Current (broken for old overdue):
  daysFromStart = differenceInDays(expiryDate, subDays(today, 30))
  xPercent = clamp(0, 100, daysFromStart / totalDays * 100)

Fixed:
  startDate = subDays(today, Math.abs(timelineStartDays))
  daysFromStart = differenceInDays(expiryDate, startDate)
  xPercent = clamp(0, 100, daysFromStart / totalDays * 100)
```

### Updated Time Axis Labels
When `timelineStartDays = -90`:
```text
-90d    -60d    -30d    Today    +30d    +60d    +90d
```

---

## Visual Mockup

### Before (current - broken)
```text
Past 30 days only - certificates older than 30 days stack at left edge

[Overdue     ] |●●●●●●●●●●●●●●                                          |
               ↑ All 14 stacked here                     
               -30d            Today                              +90d
```

### After (fixed)
```text
Past 90 days - all certificates spread out properly

[Overdue     ] |●    ●    ●●   ●   ●●    ● ● ●  ●●●  ●|                 |
               ↑ Spread across visible range
               -90d      -60d      -30d      Today              +90d
```
