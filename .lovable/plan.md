

## Standardise Project Card Row Layout

Purely cosmetic. 🟢

### Current issues
- Row 3 (avatar stack) and the "no personnel" placeholder have different heights, causing card misalignment in the grid.
- The employee/freelancer count text is mixed into the avatar row when personnel exist, and absent when they don't.
- A separate "Applicants" row with a Users icon always renders (showing "—" for non-posted projects), wasting vertical space.

### New row structure (all card types)

```text
Row 1: Name + image + badge (Posted / Recurring)
Row 2: Description (line-clamp-2)
Row 3: Avatar stack (up to 5 faces + "+X more") OR placeholder (Users icon + "No personnel assigned") — fixed min-h-[24px] so both paths match height
Row 4: "X Employees | Y Freelancers" + " | Z Applicants" for posted projects. Hidden entirely when no personnel assigned.
Row 5: Start / End / Location (mt-auto to pin to bottom)
```

### Changes — `src/components/ProjectsTab.tsx` (ProjectCard only)

**Row 3** (lines 244–271): Restructure into two separate blocks sharing a wrapper with `min-h-[24px]`:
- **Has personnel**: avatar stack (`.slice(0, 5)` instead of 4), then "+X more" overflow label.
- **No personnel**: `<Users>` icon + "No personnel assigned" muted text, same height.

**Row 4** (new, replaces old lines 262–266 and 273–276): Render only when `assignedPersonnel.length > 0`. Single line: `"X Employees | Y Freelancers"`, and if `isPosted`, append `" | Z Applicants"`.

**Row 5** (lines 277–284): Unchanged, stays `mt-auto`.

**Remove**: The standalone "Applicants" row (lines 273–276) — applicant count moves into Row 4.

### Files
- `src/components/ProjectsTab.tsx`

