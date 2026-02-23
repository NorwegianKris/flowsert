

## Fix Three Bugs: Worker Group Members View, Notifications Log Scroll, Expiry Details Document Viewer

**Risk: GREEN** -- all three are purely UI changes with no backend, schema, or RLS modifications.

---

### Bug 1: Clicking a group in Manage Groups should show its members

**Current behavior:** Clicking a group row in `WorkerGroupsManageList` does nothing (only edit/delete icon buttons exist).

**Fix:** Add click behavior to each group row that expands/reveals the list of personnel assigned to that group. When a member is clicked, open the `PersonnelPreviewSheet` sidebar (same component used in the project "New Project" flow).

**Files changed:**
- `src/components/WorkerGroupsManageList.tsx`
  - Add state for `expandedGroupId` to track which group is clicked/expanded
  - Query `personnel_worker_groups` to get member personnel IDs for the expanded group
  - Query `personnel` table to get member details (name, email, role, category, etc.)
  - Render an expandable member list below each group row when clicked
  - Add state for `previewPersonnel` and render `PersonnelPreviewSheet` -- when a member row is clicked, open the sidebar with that person's profile
  - Import `PersonnelPreviewSheet` and the `Personnel` type

---

### Bug 2: Notifications Log is not scrollable

**Current behavior:** The `DialogContent` has `overflow-y-auto` but the combination of `max-h-[80vh]` on the dialog and `max-h-[55vh]` on the ScrollArea may not work correctly because the dialog itself also tries to scroll, creating competing scroll contexts.

**Fix in `src/components/NotificationsLog.tsx`:**
- Change `DialogContent` from `overflow-y-auto` to `overflow-hidden` (let the inner ScrollArea handle scrolling)
- Ensure the list-view `ScrollArea` properly fills available space without the negative margin trick (`-mx-6 px-6`) which can interfere with scroll detection

---

### Bug 3: Clicking a certificate in Expiry Details should open a document viewer

**Current behavior:** Clicking a row in `ExpiryDetailsList` navigates to the personnel's profile page. There is no document preview.

**Fix:**
- Add `documentUrl` field to the `TimelineEvent` interface in `src/components/timeline/types.ts`
- Populate `documentUrl` when building timeline events in `src/components/ExpiryTimeline.tsx`
- In `src/components/timeline/ExpiryDetailsList.tsx`:
  - Add a document preview icon button on each certificate row (only when `documentUrl` exists)
  - Clicking the icon opens a document viewer dialog (using `PdfViewer` for PDFs, image viewer for images -- same pattern as `PersonnelPreviewSheet`)
  - The existing row click (navigating to personnel) remains as the default action; the document icon is a separate click target
  - Import `PdfViewer`, `getSignedUrl`, and add local state for preview

### Files Changed (4 total)

1. `src/components/WorkerGroupsManageList.tsx` -- expandable member list + profile sidebar
2. `src/components/NotificationsLog.tsx` -- fix scroll container
3. `src/components/timeline/types.ts` -- add `documentUrl` to `TimelineEvent`
4. `src/components/ExpiryTimeline.tsx` -- pass `documentUrl` into events
5. `src/components/timeline/ExpiryDetailsList.tsx` -- add document preview button + viewer dialog

