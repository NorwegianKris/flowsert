

## Add Edit Capability to Timeline Items + Fix Button Styling

**Risk: GREEN** -- purely UI changes, no backend/schema/RLS modifications.

---

### Change 1: Add inline editing for each timeline item

**File: `src/components/EditTimelineItemsDialog.tsx`**

- Add a pencil icon button next to the trash icon on each `ItemRow`
- Clicking the pencil toggles inline edit mode for that row, showing:
  - For milestones/events: an input field for description, a date picker for the date
  - For phases: an input field for name, date pickers for start/end dates
- Add "Save" and "Cancel" buttons in edit mode
- The dialog description will be updated to: "Edit or remove milestones, events, or phases from the project timeline."

**New props needed on the dialog:**
- `onUpdateCalendarItem: (itemId: string, updates: { description?: string; date?: string }) => void`
- `onUpdatePhase: (phaseId: string, updates: { name?: string; startDate?: string; endDate?: string }) => void`

**File: `src/components/ProjectDetail.tsx`**

- Add `handleUpdateCalendarItem` function that updates a calendar item's description/date in the project's `calendarItems` array and calls `onUpdateProject`
- Add `handleUpdatePhase` function -- this will call an `updatePhase` function from `useProjectPhases`

**File: `src/hooks/useProjectPhases.ts`**

- Add an `updatePhase` function that updates the phase name/dates in the `project_phases` table via Supabase, then re-fetches

---

### Change 2: Match Edit Timeline button style to Edit Project / Share Project

**File: `src/components/project-timeline/ProjectTimeline.tsx`**

- Change the Edit timeline button from `variant="secondary"` to `variant="outline"` to match the Edit Project and Share Project buttons in the project header

---

### Files Changed (4)

1. `src/components/EditTimelineItemsDialog.tsx` -- add pencil edit button + inline editing for each item
2. `src/components/ProjectDetail.tsx` -- add update handlers and pass them to dialog
3. `src/hooks/useProjectPhases.ts` -- add `updatePhase` function
4. `src/components/project-timeline/ProjectTimeline.tsx` -- change button variant to `outline`
