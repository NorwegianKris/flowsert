

# Interactive Clicks on Project Timeline and Expiry Timeline

**Risk: GREEN** -- purely UI interaction changes, no database/schema/RLS modifications.

## Two Features

### 1. Click Phase / Milestone / Event in Project Timeline to Show Detail Popup

Currently, clicking these items only shows a hover tooltip. We will add an `onClick` handler that opens a Dialog (popup) with full details.

**Approach:**
- Create a new component `src/components/project-timeline/TimelineItemDetailDialog.tsx` that accepts an item (phase, milestone, or event) and displays its details in a Dialog
- The dialog will show:
  - For milestones/events: description, date, type (milestone or event)
  - For phases: name, start date, end date, color
- Modify `MilestoneLane.tsx`, `EventsLane.tsx`, and `PhaseLane.tsx` to:
  - Accept an `onItemClick` callback prop
  - Add `onClick` handlers to each item element that call `onItemClick` with the item data
- Modify `ProjectTimeline.tsx` to:
  - Hold state for the selected item (`selectedItem`) and whether the dialog is open
  - Pass `onItemClick` to each lane component
  - Render the `TimelineItemDetailDialog`

### 2. Click Dot in Expiry Timeline to Open Document Viewer

Currently, clicking a dot in `TimelineChart.tsx` navigates to the personnel page. We will change it to open the document viewer (same pattern used in `ExpiryDetailsList.tsx`) when the certificate has a `documentUrl`, and fall back to the personnel navigation otherwise.

**Approach:**
- Modify `TimelineChart.tsx` to:
  - Add state for document preview (`docPreview`) -- same pattern as `ExpiryDetailsList.tsx`
  - Import `getSignedUrl`, `PdfViewer`, `Dialog`, and related components
  - Change `handleEventClick` to check if the event has a `documentUrl`; if yes, open the document viewer dialog; if no, navigate to personnel page as before
  - Render a document preview Dialog at the bottom of the component

## Files to Create
| File | Purpose |
|------|---------|
| `src/components/project-timeline/TimelineItemDetailDialog.tsx` | Reusable dialog showing details of a phase, milestone, or event |

## Files to Modify
| File | Change |
|------|--------|
| `src/components/project-timeline/MilestoneLane.tsx` | Add `onItemClick` prop, attach `onClick` to milestone markers |
| `src/components/project-timeline/EventsLane.tsx` | Add `onItemClick` prop, attach `onClick` to event markers |
| `src/components/project-timeline/PhaseLane.tsx` | Add `onItemClick` prop, attach `onClick` to phase bars |
| `src/components/project-timeline/ProjectTimeline.tsx` | Manage selected item state, pass callbacks to lanes, render detail dialog |
| `src/components/timeline/TimelineChart.tsx` | Add document preview state and dialog; change dot click to open document viewer when `documentUrl` exists |

