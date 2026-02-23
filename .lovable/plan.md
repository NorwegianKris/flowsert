

## Fix Applicant Count After Rejection + Add Timeline Edit/Delete Functionality

**Risk: GREEN** -- purely UI changes, no backend/schema/RLS modifications.

---

### Bug 1: Applicant count doesn't update after rejecting an application

**Root cause:** Two separate locations show the count incorrectly:

1. **`ProjectDetail.tsx` (line 252):** Uses `applications.length` (total count including rejected). Should filter to exclude rejected applications, matching the same logic used in `ProjectApplicationsList` which filters `app.status !== 'rejected'`.

2. **`ProjectsTab.tsx` (line 150-157):** The `ProjectCard` component fetches applicant count once on mount via a `select('id', { count: 'exact', head: true })` query with no status filter. It needs to add `.neq('status', 'rejected')` to exclude rejected applicants. It also never re-fetches after a rejection happens in the detail view.

**Fix:**
- **`ProjectDetail.tsx`**: Change `applications.length` to `applications.filter(a => a.status !== 'rejected').length` (2 occurrences on line 252)
- **`ProjectsTab.tsx`**: Add `.neq('status', 'rejected')` to the count query on line 155-157

---

### Bug 2: No way to edit or delete milestones, events, or phases on the timeline

**Current state:** The timeline header has "Add event or milestone" and "Define phase" buttons, but no way to manage existing items.

**Fix:** Add a grey "Edit timeline" button next to the "Define phase" button. Clicking it opens a dialog that lists all current milestones, events, and phases with options to delete each one.

**Files changed:**

- **`ProjectDetail.tsx`**: Add new state `isEditTimelineOpen` and pass the open handler + calendar item/phase data to the timeline. Pass `onRemoveCalendarItem` and `onRemovePhase` callbacks.

- **`ProjectTimeline.tsx`**: 
  - Add new prop `onEditTimeline?: () => void`
  - Add a grey `variant="secondary"` edit button next to the existing buttons in the header

- **New file: `src/components/EditTimelineItemsDialog.tsx`**:
  - A dialog listing all milestones, events, and phases in grouped sections
  - Each item shows its name/description and date, with a delete (trash) icon button
  - Milestones and events call `onRemoveCalendarItem(itemId)`
  - Phases call `onRemovePhase(phaseId)`
  - Renders in `ProjectDetail.tsx`

### Files Changed (4)

1. `src/components/ProjectDetail.tsx` -- fix applicant count filter, add edit timeline dialog state and callbacks
2. `src/components/ProjectsTab.tsx` -- add `.neq('status', 'rejected')` to applicant count query
3. `src/components/project-timeline/ProjectTimeline.tsx` -- add grey edit button
4. `src/components/EditTimelineItemsDialog.tsx` -- new dialog for editing/deleting timeline items
