

## Expandable Personal Calendar — Compact + Full Modal

### Overview
Keep the compact calendar card as-is in the worker profile. Add an "Expand" button to open a large two-column modal with full calendar on the left and detail panel on the right. Remove the existing small dialog that opens on day click. Day clicks in compact view do nothing (or just highlight); all interaction happens in the expanded modal.

### Changes — `src/components/AvailabilityCalendar.tsx`

**1. New state**
- `isExpanded` boolean to control the large modal
- `expandedSelectedRange` separate range state for the modal calendar (so compact view doesn't trigger dialogs)

**2. Compact view changes**
- Add "Expand" button in `CardHeader` top-right: `<Button variant="outline" size="sm" onClick={() => setIsExpanded(true)}><Maximize2 /> Expand</Button>`
- Remove the existing `<Dialog>` that opens on day click (lines 433-569) — no interaction on compact calendar day clicks beyond visual modifiers
- Keep legend, tip banner, calendar with modifiers/styles unchanged

**3. Expanded Modal** — new `<Dialog open={isExpanded}>` with `<DialogContent className="max-w-[860px] max-h-[90vh] overflow-y-auto p-0">`

Layout: `flex flex-row` inside DialogContent

**Left column (flex-1, ~500px):**
- Full Calendar component with `mode="range"`, same modifiers/styles but with larger cell sizing via classNames overrides
- Month navigation arrows (already built into Calendar)
- Range selection updates `expandedSelectedRange`
- Legend row below calendar (same 6 indicators)

**Right column (w-[320px], border-l, p-5, overflow-y-auto):**
- Empty state: "Select a day or period to set availability" centered text
- When `expandedSelectedRange.from` is set:
  - **Date heading** — formatted date or range
  - **Assigned Projects** — reuse existing `getProjectsOnDate` / cert expiry warning logic
  - **Set Availability** — 2x2 grid, notes, Save, Remove (same JSX as current dialog)

**4. Event Overview section** — below the calendar in the left column:
- Heading: "Upcoming Events"
- Query next 3 months of data from `allProjectOnPeriods` + `availability` + `certificateExpiryDates`
- Group by month, each month as a subheading
- Each row: color dot, event name, date range, type badge
- Wrapped in `ScrollArea` with max-height ~200px

**5. Cleanup**
- Remove the old `<Dialog open={!!selectedRange?.from}>` entirely
- Compact calendar keeps `selectedRange` for visual highlight only (no dialog trigger)

### File
- `src/components/AvailabilityCalendar.tsx`

