
# Zoomable Event Timeline

## Overview
Add zoom functionality to the Expiry Timeline, allowing admins to expand the view beyond the current 90-day range to see certificates expiring further in the future (up to 2 years).

## User Experience

### Zoom Controls
A control bar will appear above the Event Timeline section with:
1. **Preset buttons**: Quick-select common ranges (3 months, 6 months, 1 year, 2 years)
2. **Slider**: Fine-tune the end range from 90 days to 730 days (2 years)
3. **Reset button**: Return to default 90-day view

### Visual Behavior
- Zooming out compresses existing events to fit more time on the axis
- New lane categories appear for extended ranges (91-180 days, 181-365 days, 365+ days)
- Time axis labels adapt to show appropriate markers (months, quarters)
- Events beyond 90 days get a neutral gray color to distinguish from urgent items

---

## Technical Changes

### 1. Update Types (`src/components/timeline/types.ts`)

Add new status types and lane configurations for extended ranges:

| New Status | Days Range | Color | Label |
|------------|------------|-------|-------|
| `days91to180` | 91-180 | Blue | 91-180 Days |
| `days181to365` | 181-365 | Indigo | 6-12 Months |
| `beyond365` | 365+ | Gray | 1+ Year |

Update `getEventStatus()` and `getEventColor()` functions to handle extended ranges.

### 2. Add Zoom State to ExpiryTimeline (`src/components/ExpiryTimeline.tsx`)

```text
State:
- timelineEndDays: number (default: 90, max: 730)

Props passed to TimelineChart:
- timelineEndDays
- onZoomChange callback
```

### 3. Create Zoom Controls Component (`src/components/timeline/TimelineZoomControls.tsx`)

New component containing:
- Preset buttons (3m, 6m, 1y, 2y)
- Radix Slider for fine control
- Current range display (e.g., "Showing next 180 days")
- Reset button when not at default

```text
Layout:
[3m] [6m] [1y] [2y]  |  [====o=====]  |  "180 days"  [Reset]
```

### 4. Update TimelineChart (`src/components/timeline/TimelineChart.tsx`)

Dynamic calculations based on zoom level:
- Accept `timelineEndDays` prop
- Calculate `TOTAL_DAYS` dynamically: `timelineEndDays - TIMELINE_START_DAYS`
- Generate appropriate time axis labels based on range:
  - Under 6 months: Monthly markers (+30d, +60d, +90d...)
  - 6-12 months: Quarterly markers (+3mo, +6mo, +9mo, +12mo)
  - Over 1 year: Bi-annual markers (+6mo, +1y, +18mo, +2y)
- Include extended lane configurations when zoomed out
- Filter events based on dynamic range instead of hardcoded 90 days

### 5. Update Event Filtering in ExpiryTimeline

Remove the `status !== 'beyond90'` filter and replace with dynamic filtering:
```text
daysUntil <= timelineEndDays
```

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `src/components/timeline/types.ts` | Modify | Add extended lane configs and update status functions |
| `src/components/timeline/TimelineZoomControls.tsx` | Create | New zoom control component with slider and presets |
| `src/components/timeline/TimelineChart.tsx` | Modify | Accept dynamic range, update position/label calculations |
| `src/components/ExpiryTimeline.tsx` | Modify | Add zoom state, render zoom controls, pass props |

---

## Extended Lane Configuration

```text
Default view (90 days):
  [Overdue] [Next 30] [31-60] [61-90]

Zoomed to 180 days:
  [Overdue] [Next 30] [31-60] [61-90] [91-180]

Zoomed to 365 days:
  [Overdue] [Next 30] [31-60] [61-90] [91-180] [181-365]

Zoomed to 730 days:
  [Overdue] [Next 30] [31-60] [61-90] [91-180] [181-365] [1-2 Years]
```

---

## Interaction Details

1. **Default State**: Timeline shows -30 to +90 days (current behavior)
2. **Zoom Out**: User clicks "6m" or drags slider right
   - Timeline expands to show 180 days
   - New "91-180 Days" lane appears (if events exist)
   - Existing dots compress horizontally
   - Time axis updates with new markers
3. **Zoom In**: User clicks "3m" or drags slider left
   - Returns to default 90-day view
   - Extended lanes disappear
4. **Reset**: One-click return to default view

## Visual Mockup

```text
Expiry Timeline
Click any group or lane to view affected certificates and personnel

[Status Cards Grid - unchanged]

────────────────────────────────────────

Event Timeline
                                    
[3m] [6m] [1y] [2y]    [====o=========]    Showing next 180 days    [↺]

[Overdue     ] |●●      ●  |                                            |
[Next 30 Days] |   ●●● ●   |                                            |
[31-60 Days  ] |           | ●●●●●                                      |
[61-90 Days  ] |           |       ●●●                                  |
[91-180 Days ] |           |              ●●     ●                      |
               ─────────────────────────────────────────────────────────
               Today      +30d    +60d    +90d         +120d      +180d
```
