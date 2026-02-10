

# Add "Add Event or Milestone" Button to Project Timeline

## Overview

Move the add button from the project header area into the Project Timeline card header (top-right), and replace the single-step dialog with a two-step flow: first pick between "Event" or "Milestone", then fill in details.

## Changes

### 1. Update `ProjectTimeline.tsx`

- Add an `onAddItem` prop callback
- Add a "Add event or milestone" button (with `Plus` icon) in the `CardHeader`, aligned to the right of the title using flexbox

### 2. Update `AddCalendarItemDialog.tsx` (Rework)

Replace the current single-form dialog with a two-step dialog:

**Step 1 -- Type Selection**
- Dialog title: "Add to Timeline"
- Two clickable cards side by side:
  - **Event** (with `CalendarDays` icon): "A general project event such as a meeting, delivery, or deadline. Shown as a dot on the timeline."
  - **Milestone** (with `Flag` icon): "A key project milestone marking a significant phase or achievement. Shown as a prominent marker on the timeline."
- Clicking either card advances to step 2 with `isMilestone` pre-set

**Step 2 -- Details Form**
- Title updates to "Add Event" or "Add Milestone" based on selection
- Same date + description fields as today
- The milestone checkbox is removed (already chosen in step 1)
- A "Back" button to return to step 1
- Submit button labeled "Add Event" or "Add Milestone"

### 3. Update `ProjectDetail.tsx`

- Remove the "Add Milestone" button from the top header button row
- Pass `onAddItem={() => setIsAddItemOpen(true)}` to `ProjectTimeline`
- Keep the `AddCalendarItemDialog` render and state as-is (just the dialog is triggered from a different place now)

## Visual Layout

```text
+-- CardHeader -------------------------------------------+
| [clock icon] Project Timeline     [+ Add event or milestone] |
| Compliance, availability, and key project events...      |
+---------------------------------------------------------+
```

## Step 1 Dialog

```text
+-- Add to Timeline ------------------+
|                                      |
|  [CalendarDays]      [Flag]          |
|   Event              Milestone       |
|   A general project  A key project   |
|   event such as...   milestone...    |
|                                      |
+--------------------------------------+
```

## Files Modified

| File | Change |
|------|--------|
| `src/components/project-timeline/ProjectTimeline.tsx` | Add `onAddItem` prop, render button in header |
| `src/components/AddCalendarItemDialog.tsx` | Two-step flow with type picker then form |
| `src/components/ProjectDetail.tsx` | Remove "Add Milestone" from top buttons, pass `onAddItem` to timeline |

## No Database Changes

Uses existing `ProjectCalendarItem` type with `isMilestone` boolean -- no schema changes needed.

