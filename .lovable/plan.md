

# Project Timeline -- Compliance, Availability & Milestones

## Overview

Replace the current `ProjectCalendar` (a month-by-month grid calendar) with a horizontal, lane-based `ProjectTimeline` component. The timeline spans exactly from project start date to project end date, with three distinct lane groups: Milestones, then per-person Availability and Compliance lanes.

## Architecture

### New Files

| File | Purpose |
|------|---------|
| `src/components/project-timeline/ProjectTimeline.tsx` | Main container: time axis, lane rendering, scroll |
| `src/components/project-timeline/TimelineHeader.tsx` | Horizontal time axis with month/week labels |
| `src/components/project-timeline/MilestoneLane.tsx` | Renders milestone markers from `project.calendarItems` |
| `src/components/project-timeline/PersonnelGroup.tsx` | Collapsible group per person with Availability + Compliance sub-lanes |
| `src/components/project-timeline/AvailabilityLane.tsx` | Renders availability bars for one person |
| `src/components/project-timeline/ComplianceLane.tsx` | Renders certificate validity bars for one person |
| `src/components/project-timeline/types.ts` | Shared types and constants |
| `src/components/project-timeline/utils.ts` | Date-to-pixel math, color helpers |
| `src/hooks/useProjectTimelineData.ts` | Fetches availability + certificate data for all assigned personnel within the project date range |

### Modified Files

| File | Change |
|------|--------|
| `src/components/ProjectDetail.tsx` | Replace `ProjectCalendar` with `ProjectTimeline`; rename "Calendar" tab to "Timeline"; update button label from "Add Calendar Item" to "Add Milestone"; update subtitle text |

## Visual Structure (Top to Bottom)

```text
+--[ Time Axis: project start -------- months -------- project end ]--+
|                                                                       |
|  MILESTONES LANE                                                      |
|  [ diamond/flag markers at milestone dates ]                          |
|                                                                       |
|  --- separator ---                                                    |
|                                                                       |
|  v  PERSON A (collapsible)                                            |
|  |  Availability  [====available====]  [gap]  [====available====]     |
|  |  Compliance    [green: Cert X][orange: Cert Y expires mid-proj]    |
|                                                                       |
|  v  PERSON B (collapsible)                                            |
|  |  Availability  [================available========================] |
|  |  Compliance    [red: Cert Z invalid]  [green: Cert W]              |
|                                                                       |
+-----------------------------------------------------------------------+
```

## Data Flow

### `useProjectTimelineData` Hook

Takes `personnelIds: string[]`, `startDate: string`, `endDate: string`. Fetches:

1. **Availability** -- query the `availability` table for all assigned personnel within the project date range. Groups records by `personnel_id`. Contiguous same-status days are merged into spans (bars).

2. **Certificates** -- already available from the `Personnel` objects passed to the component (each person has `certificates[]` with `expiryDate`). No additional DB query needed. For each certificate per person, compute:
   - Green if `expiryDate` is null (no expiry) or after project end
   - Orange if `expiryDate` falls within the project period
   - Red if `expiryDate` is before project start or already expired

### Milestones

Already available from `project.calendarItems` (filtered to `isMilestone === true` for the milestone lane; non-milestone calendar items shown as smaller markers).

## Layout and Rendering Details

### Time Axis

- Horizontal axis from `project.startDate` to `project.endDate`
- If no end date is set, show an info message prompting the admin to set one (timeline requires bounded dates)
- Labels: month names at month boundaries, with finer week ticks for shorter projects (< 6 months)
- A vertical "today" line if today falls within the project range

### Milestone Lane

- Each milestone rendered as a flag/diamond icon positioned at its date
- Non-milestone calendar items rendered as smaller dot markers
- Hover tooltip: name + date
- Click: opens the existing calendar item view (no new dialog needed)

### Personnel Groups

- Each assigned person gets a collapsible section with their name and avatar on the left
- Default: expanded for up to 5 people, collapsed beyond that
- Two sub-lanes per person:

**Availability Lane:**
- Fetched from `availability` table via the hook
- Contiguous `available` days shown as blue/teal bars
- Contiguous `partial` days shown as striped/lighter bars
- Gaps (no records or `unavailable`) are empty space
- `other` status shown as a distinct blue bar
- Hover tooltip: period dates + status
- Click: navigates to person's availability calendar (calls `onPersonnelClick`)

**Compliance Lane:**
- One bar per certificate that has an expiry date
- Bar color based on certificate validity relative to the project period:
  - Green (`bg-emerald-500`): valid throughout or no expiry
  - Orange (`bg-amber-500`): expires during the project
  - Red (`bg-red-500`): expired before/at project start
- Bars are stacked vertically within the lane (one row per certificate) or condensed as a summary bar showing worst status
- Hover tooltip: certificate name + expiry date + status text
- Click: opens `ProjectCertificateStatus` section (scrolls to it)

### Visual Separation

- Each lane type has a distinct left-side label and color coding
- Milestone lane has amber/gold background tint
- Availability lanes have blue/gray background tint
- Compliance lanes have a subtle green/red gradient background tint
- Thin separator lines between lane groups

## Interaction Rules

| Action | Target | Result |
|--------|--------|--------|
| Hover | Milestone marker | Tooltip: name + date |
| Hover | Availability bar | Tooltip: date range + status |
| Hover | Compliance bar | Tooltip: cert name + expiry date |
| Click | Milestone marker | Opens milestone in existing calendar item view |
| Click | Availability bar | Calls `onPersonnelClick` to navigate to that person |
| Click | Compliance bar | Scrolls to `ProjectCertificateStatus` section |
| Click | Person group header | Toggles collapse/expand |

## Edge Cases

- **No end date**: Show a card with a message "Set a project end date to view the timeline" and a button to edit dates (re-uses existing edit dates flow)
- **No assigned personnel**: Show only the milestone lane with a note "No personnel assigned"
- **No availability data**: Show empty availability lane with a subtle "No availability data" label
- **No certificates**: Show empty compliance lane with "No certificates" label
- **Long projects (> 1 year)**: Scale the time axis proportionally; month labels only

## Technical Notes

### Date-to-Pixel Conversion

A utility function in `utils.ts`:
```
dateToX(date, projectStart, projectEnd, totalWidth) => pixelOffset
```

All bar positions and milestone markers use this function for consistent placement.

### Responsive Behavior

- On mobile/narrow screens, the timeline scrolls horizontally within a `ScrollArea`
- Lane labels become icons only on small screens
- Personnel groups stack naturally

### No Database Changes

All data sources already exist:
- `project.calendarItems` for milestones
- `availability` table for availability (via new hook)
- `personnel.certificates` for compliance

## Summary of Changes

1. Create `useProjectTimelineData` hook to fetch availability data for the project date range
2. Create 7 new component files under `src/components/project-timeline/`
3. Update `ProjectDetail.tsx` to swap `ProjectCalendar` for `ProjectTimeline`, rename the tab, and update button labels
4. `ProjectCalendar.tsx` remains in the codebase but is no longer imported (can be removed later)
