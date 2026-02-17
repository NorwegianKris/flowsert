

## Update Posted Project Cards in Active & Upcoming Projects

Two changes to the `ProjectCard` component in `src/components/ProjectsTab.tsx`:

### 1. Replace the status badge with "Posted" for posted projects
Currently, posted projects show both a "Posted" badge next to the title AND the status badge (e.g., "Active") in the top-right corner. For posted projects, the top-right badge should show "Posted" (with the purple styling) instead of the status (Active/Pending). The inline "Posted" badge next to the title can be removed since the top-right badge now serves that purpose.

### 2. Move dates and applicant count to the bottom of the card
On regular (non-posted) project cards, the start/end dates sit at the very bottom of the card content. On posted cards, they should be at the same vertical position. Currently the applicant count appears below the dates via `mt-2`. Both dates and applicant count should remain at the bottom, consistent with regular cards.

### Technical Details

**File: `src/components/ProjectsTab.tsx`**

In the `ProjectCard` component:

- **Lines 176-180**: Remove the inline "Posted" badge next to the project title (the one inside the header's left side)
- **Lines 182-185**: Change the top-right badge to conditionally render: if `isPosted`, show the purple "Posted" badge (with `Megaphone` icon); otherwise show the regular status badge as before
- **Lines 211-222**: Keep dates and applicant count at the bottom -- no structural change needed here since they're already at the bottom of `CardContent`. The layout is already consistent with non-posted cards.

