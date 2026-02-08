
# Visual Timeline for Certificate Expiry Events

## Overview
Add an interactive visual timeline below the existing expiry groups in the ExpiryTimeline component. This timeline will display individual certificate expiry events on a scrollable, zoomable date axis, color-coded by their urgency status.

## Feature Design

### Timeline Visualization
```text
+-----------------------------------------------------------------------+
|  Expiry Groups (existing 4 cards: Overdue, 30d, 31-60d, 61-90d)       |
+-----------------------------------------------------------------------+
|                                                                       |
|  Timeline Controls:                                                   |
|  [Date Picker: From] [Date Picker: To]  |  Zoom: [-] [====] [+]       |
|                                                                       |
+-----------------------------------------------------------------------+
|  Visual Timeline                                                      |
|  <-- scroll left                               scroll right -->       |
|                                                                       |
|  |----|----|----|----|----|----|----|----|----|----|----|----|        |
|  Feb 1    Feb 8   Feb 15  Feb 22   Mar 1   Mar 8   Mar 15  ...        |
|    *        **      *       ***       *              **               |
|   (red)   (red)  (orange) (orange) (yellow)        (green)            |
|                                                                       |
|  * = certificate expiry event (clickable dots)                        |
+-----------------------------------------------------------------------+
```

### Components to Create

**1. TimelineChart Component** (`src/components/TimelineChart.tsx`)
- Renders a Recharts ScatterChart with expiry events plotted by date
- X-axis: Date range (adjustable)
- Y-axis: Stacked by personnel or certificate type (optional)
- Dots colored by expiry status (red/orange/yellow/green)
- Clickable dots that navigate to certificate/personnel detail

**2. TimelineControls Component** (inline or separate)
- Date range picker (From/To) using existing date picker components
- Zoom slider to adjust visible range (7 days to 180 days)
- Reset button to return to default view

### Data Structure

Each event on the timeline:
```typescript
interface TimelineEvent {
  id: string;                    // Certificate ID
  personnelId: string;           // Personnel ID for navigation
  personnelName: string;         // For tooltip display
  certificateName: string;       // For tooltip display
  expiryDate: Date;              // X-axis position
  daysUntilExpiry: number;       // For coloring
  status: 'overdue' | 'next30' | 'days31to60' | 'days61to90' | 'beyond90';
  color: string;                 // Fill color for the dot
}
```

### Timeline Range Logic
- Default view: -30 days (overdue) to +90 days (future)
- User can adjust via:
  1. **Date pickers**: Select specific From/To dates
  2. **Zoom control**: Slider that expands/contracts the visible range
  3. **Drag scroll**: Horizontal scroll within the timeline area

### Color Mapping
| Status | Days | Color |
|--------|------|-------|
| Overdue | < 0 | Red (#ef4444) |
| Next 30 days | 0-30 | Orange (#f97316) |
| 31-60 days | 31-60 | Yellow (#eab308) |
| 61-90 days | 61-90 | Green (#22c55e) |
| Beyond 90 | > 90 | Gray (muted) |

### Interactions
1. **Hover on dot**: Tooltip showing personnel name, certificate name, expiry date
2. **Click on dot**: Navigate to personnel detail page with certificate expanded
3. **Scroll/Pan**: Horizontal scroll to view more dates
4. **Zoom**: Adjust date range granularity

---

## Technical Implementation

### Files to Modify

**`src/components/ExpiryTimeline.tsx`**
- Add state for timeline date range (`startDate`, `endDate`)
- Add state for zoom level
- Compute timeline events from filtered personnel
- Render new TimelineChart below the expiry groups

**`src/components/TimelineChart.tsx`** (new file)
- Use Recharts ScatterChart for dot-based visualization
- Implement custom tooltip with certificate details
- Handle click events for navigation
- Responsive container with horizontal scroll

### Dependencies
- Uses existing `recharts` library (already installed)
- Uses existing `date-fns` for date manipulation
- Uses existing UI components (Card, Input, Slider, Popover, Calendar)

### State Management
```typescript
// In ExpiryTimeline.tsx
const [timelineRange, setTimelineRange] = useState({
  start: subDays(new Date(), 30),  // 30 days ago (show overdue)
  end: addDays(new Date(), 90),    // 90 days from now
});
const [zoomLevel, setZoomLevel] = useState(50); // 0-100 slider
```

### Timeline Events Computation
```typescript
const timelineEvents = useMemo(() => {
  const events: TimelineEvent[] = [];
  
  filteredPersonnel.forEach(person => {
    person.certificates.forEach(cert => {
      if (!cert.expiryDate) return; // Skip non-expiring
      
      const expiryDate = parseISO(cert.expiryDate);
      const daysUntil = getDaysUntilExpiry(cert.expiryDate);
      
      // Only include events within the visible range
      if (expiryDate >= timelineRange.start && expiryDate <= timelineRange.end) {
        events.push({
          id: cert.id,
          personnelId: person.id,
          personnelName: person.name,
          certificateName: cert.name,
          expiryDate,
          daysUntilExpiry: daysUntil,
          status: getEventStatus(daysUntil),
          color: getEventColor(daysUntil),
        });
      }
    });
  });
  
  return events.sort((a, b) => a.expiryDate.getTime() - b.expiryDate.getTime());
}, [filteredPersonnel, timelineRange]);
```

---

## UI Layout Update

The ExpiryTimeline Card will be restructured:

```text
Card
├── CardHeader (existing)
│   └── "Expiry Timeline" title
├── CardContent
│   ├── Expiry Groups Grid (existing 4 cards)
│   ├── Separator
│   └── Timeline Section (new)
│       ├── Timeline Controls
│       │   ├── Date range pickers (From/To)
│       │   └── Zoom slider
│       └── ScrollArea (horizontal)
│           └── TimelineChart (ScatterChart)
```

---

## Edge Cases Handled

1. **No certificates with expiry**: Show empty state message
2. **All certificates beyond 90 days**: Allow extending range via controls
3. **Dense clusters**: Use jitter or stacking to prevent dot overlap
4. **Mobile view**: Simplify controls, maintain horizontal scroll
5. **Dark mode**: Colors already use Tailwind dark variants

---

## Summary

This implementation adds a visual, interactive timeline below the existing expiry group cards. Users can:
- See all certificate expiry events plotted on a date axis
- Adjust the visible date range using pickers or zoom
- Click events to drill down to specific certificates
- Filter by personnel category (applied from parent filter)

The timeline uses the existing Recharts library and follows the established traffic-light color system.
