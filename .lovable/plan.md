

# Expiry Timeline Refactor - Lane-Based Event Timeline

## Overview
Refactor the timeline visualization from a single scatter plot with mixed dots to a lane-based timeline where each expiry category has its own horizontal lane. This creates a clearer visual separation of risk levels while removing complex controls that don't fit a read-only overview.

## Visual Design

```text
+-----------------------------------------------------------------------+
|  Expiry Summary Cards (KEEP AS-IS)                                    |
|  [Overdue] [Next 30 Days] [31-60 Days] [61-90 Days]                   |
+-----------------------------------------------------------------------+
|                                                                       |
|  Lane-Based Timeline                                                  |
|                                                                       |
|  Overdue      | * *   *      *                    |  (Red lane)       |
|  Next 30 Days |          *  * **    *             |  (Orange lane)    |
|  31-60 Days   |                      *   *  *     |  (Yellow lane)    |
|  61-90 Days   |                             * * * |  (Green lane)     |
|               |----|----|----|----|----|----|-----|                   |
|               Today  +2w  +4w  +6w  +8w  +10w +12w                    |
+-----------------------------------------------------------------------+
```

## Changes Summary

### Remove (TimelineControls.tsx)
- Date range pickers (From/To)
- Zoom slider and buttons
- Reset button
- The entire TimelineControls component will no longer be used

### Modify (TimelineChart.tsx - complete rewrite)
- Replace ScatterChart with a custom lane-based visualization
- Four horizontal lanes, one per category
- Events positioned by date along X-axis
- Lane labels on the left are clickable (same navigation as cards)
- Empty lanes are collapsed/hidden

### Update (ExpiryTimeline.tsx)
- Remove state management for date range
- Use fixed range: -30 days to +90 days (covering all four categories)
- Remove TimelineControls import and usage
- Keep existing summary cards unchanged

### Update (types.ts)
- Remove TimelineRange interface (no longer needed)
- Keep TimelineEvent and helper functions

---

## Technical Details

### New TimelineChart Structure
The chart will use a combination of:
- Fixed Y-axis with 4 lanes (Overdue, Next 30, 31-60, 61-90)
- Custom rendering for each lane row
- Events as small circles within their lane
- Clickable lane labels for navigation

### Lane Configuration
```typescript
const lanes = [
  { id: 'overdue', label: 'Overdue', color: '#ef4444', bgColor: 'bg-red-500/10' },
  { id: 'next30', label: 'Next 30 Days', color: '#f97316', bgColor: 'bg-orange-500/10' },
  { id: 'days31to60', label: '31-60 Days', color: '#eab308', bgColor: 'bg-yellow-500/10' },
  { id: 'days61to90', label: '61-90 Days', color: '#22c55e', bgColor: 'bg-emerald-500/10' },
];
```

### Event Positioning Logic
- X position: Based on expiry date relative to today
- Y position: Fixed per lane (e.g., lane 0 = y:0, lane 1 = y:1, etc.)
- Within-lane jitter: Small vertical offset for events on same date

### Tooltip Content (on hover)
- Certificate type
- Person name  
- Expiry date
- Days until/overdue

### Click Behavior
- Event dot click: Navigate to personnel detail (`/admin?tab=personnel&personnelId=...`)
- Lane label click: Navigate with filter (`/admin?tab=personnel&status=overdue` or `&expiryMin=0&expiryMax=30`)

### Fixed Timeline Range
- Start: 30 days ago (to show overdue items)
- End: 90 days from today
- X-axis shows "Today" marker and week/month labels

### Empty Lane Handling
- Lanes with no events are collapsed (height: 0, hidden)
- Remaining lanes expand to use available space

---

## Files to Modify

| File | Action | Description |
|------|--------|-------------|
| `src/components/timeline/TimelineChart.tsx` | Rewrite | Replace scatter chart with lane-based visualization |
| `src/components/timeline/types.ts` | Update | Remove TimelineRange, keep other types |
| `src/components/ExpiryTimeline.tsx` | Simplify | Remove date range state and controls |
| `src/components/timeline/TimelineControls.tsx` | Delete | No longer needed |

---

## Mobile Responsiveness
- Lane labels stack above lanes on narrow screens
- Touch-friendly event dots (min 24px tap target)
- Horizontal scroll if timeline overflows
- Tooltips positioned to avoid edge clipping

