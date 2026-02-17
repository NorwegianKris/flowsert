

## Move Project Applications to a Top-Level Card in Project Detail

Currently, project applications from workers wanting to join a posted project are buried in an "Applications" tab alongside Personnel, Calendar, and Documents. The goal is to make them more visible by placing them in a prominent card at the top of the project detail view -- similar in style to the "Project Invitations" card that workers see on their dashboard.

### Changes

**1. `src/components/ProjectDetail.tsx`**
- Add a new `ProjectApplicationsList`-style card immediately after the project header card (before the stats cards), visible only when the project is posted
- The card will use a similar visual treatment to `WorkerInvitations`: a highlighted border (`border-primary/30 bg-primary/5`), an icon, title ("Project Applications"), and a pending count badge
- Each pending application will show the applicant's avatar, name, role, date, and Accept/Reject buttons inline
- Clicking an application row will still open the existing detail dialog with the full message
- Remove the "Applications" tab from the right-side tabs panel since it's now shown at the top
- Clean up the tab grid columns logic (back to always `grid-cols-3`)

**2. `src/components/ProjectApplicationsList.tsx`**
- Refactor to accept an optional `variant` prop or simply restyle to match the `WorkerInvitations` card pattern (highlighted card with border, icon header, and pending count badge)
- Alternatively, keep the existing component as-is and wrap it in the new card layout directly inside `ProjectDetail.tsx`

### Approach
The simplest approach is to wrap the existing `ProjectApplicationsList` inside a styled card (matching `WorkerInvitations` visual style) placed at the top of `ProjectDetail`, and remove the Applications tab. This avoids duplicating accept/reject logic.

### Technical Details

In `ProjectDetail.tsx`:
- After the stats cards section (~line 266), insert a conditional block: if `project.isPosted`, render a `Card` with `className="border-border/50 border-primary/30 bg-primary/5"` containing a `CardHeader` with an Inbox icon, "Project Applications" title, and a pending count badge, then a `CardContent` embedding `<ProjectApplicationsList projectId={project.id} />`
- Remove the Applications tab trigger (lines 305-310) and tab content (lines 417-421)
- Simplify the TabsList grid back to `grid-cols-3` (line 292)

