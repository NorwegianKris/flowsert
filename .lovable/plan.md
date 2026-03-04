

## Fix Project Card Height Consistency

Purely cosmetic. 🟢

### Changes — `src/components/ProjectsTab.tsx` (ProjectCard)

Merge Row 3 and Row 4 into a single row with fixed height, and add a min-height to the Card.

**Single personnel row** (replaces lines 244–285):
- One `div` with `flex items-center min-h-[28px] mb-2`.
- **Has personnel**: avatars on the left, `ml-auto` pushes "X Employees | Y Freelancers" (+ "| Z Applicants" for posted) to the right. All vertically centered.
- **No personnel**: Users icon + "No personnel assigned" — same row, same height.

**Card min-height**: Add `min-h-[240px]` to the Card component to prevent grid misalignment.

### File
- `src/components/ProjectsTab.tsx`

