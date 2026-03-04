

## Make Project Cards Consistent in Size and Content

Cosmetic only. 🟢

### Problem
Cards vary in height because some sections render conditionally — personnel avatars only show when `assignedPersonnel.length > 0`, applicant count only shows for posted projects, and end date / location only show when present. This causes uneven card sizes across the grid.

### Fix
Always render every content section, using placeholder/fallback text when data is absent. Keep existing conditional badges (Posted, Recurring) and their coloring unchanged.

Changes in `src/components/ProjectsTab.tsx` `ProjectCard` component:

1. **Personnel row** — always render. When no personnel assigned, show "No personnel assigned" in muted text instead of hiding the row entirely.

2. **Applicant count row** — always render for consistency. For non-posted projects, show "— Applicants" or simply "0 Applicants" with the same icon layout. This keeps vertical space consistent.

3. **Date/location footer** — always render Start, End, and Location lines. Use "—" as fallback for missing end date or location so every card has the same number of lines.

4. **Description** — already uses `line-clamp-2`, which is good. No change needed.

5. **Card min-height** — optionally add `min-h-[200px]` to the Card to enforce a baseline, though the always-rendered rows should handle this naturally.

### Specific code changes

All in `src/components/ProjectsTab.tsx`, within the `ProjectCard` function:

- **Lines 244-266** (personnel section): Remove the `{assignedPersonnel.length > 0 && ...}` conditional wrapper. Always render the row. When `assignedPersonnel.length === 0`, show a `<span>` with "No personnel assigned".

- **Lines 269-273** (applicant count): Remove the `{isPosted && ...}` conditional. Always show the row; display `0 Applicants` for non-posted projects.

- **Lines 277-284** (end date & location): Remove conditionals around end date and location. Show "—" when values are absent.

