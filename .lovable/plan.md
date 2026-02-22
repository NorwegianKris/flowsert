
## Click Lane Labels to Open and Highlight Expiry Details

**Risk: GREEN** -- purely UI interaction change, no backend/data changes.

### What Changes

Clicking any of the four summary boxes (Overdue, Next 30 Days, 31-60 Days, 61-90 Days) or lane labels in the timeline chart will:

1. **Open** the Expiry Details collapsible dropdown (if not already open)
2. **Highlight** the corresponding lane section with a purple ring/shadow frame
3. **Auto-scroll** the highlighted section into view
4. The highlight fades after 3 seconds

The boxes and lane labels will no longer navigate away to the personnel tab. Individual event dots in the timeline chart still navigate to personnel profiles.

### Technical Detail

**File: `src/components/ExpiryTimeline.tsx`**

- Add two new state variables: `highlightedLaneId` (string | null) and `detailsListOpen` (boolean)
- Create a `handleLaneHighlight` function that sets both states
- Change `handleGroupClick` to call `handleLaneHighlight` instead of navigating
- Pass `onLaneClick={handleLaneHighlight}` to `TimelineChart`
- Pass `highlightedLaneId`, `open={detailsListOpen}`, `onOpenChange={setDetailsListOpen}` to `ExpiryDetailsList`
- Remove the `ChevronRight` icon from the summary boxes (since they no longer navigate away)

**File: `src/components/timeline/TimelineChart.tsx`**

- Add optional `onLaneClick?: (laneId: string) => void` prop
- Change `handleLaneClick` to call `onLaneClick` if provided, otherwise fall back to navigation

**File: `src/components/timeline/ExpiryDetailsList.tsx`**

- Add props: `highlightedLaneId?: string | null`, `open?: boolean`, `onOpenChange?: (open: boolean) => void`
- Use controlled open/onOpenChange on the Collapsible when provided
- Apply `ring-2 ring-primary shadow-md` to the lane div when `highlightedLaneId` matches `lane.id`
- Use a ref + `scrollIntoView({ behavior: 'smooth', block: 'nearest' })` to auto-scroll to highlighted section
- Auto-clear highlight after 3 seconds via `useEffect` with a timeout

Three files modified, no database or backend changes.
