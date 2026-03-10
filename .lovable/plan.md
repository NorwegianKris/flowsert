
Goal: make every project card in the projects grid pixel-consistent by enforcing a strict 5-zone layout with fixed reserved space per zone, regardless of content presence.

Implementation scope:
- src/components/ProjectsTab.tsx (ProjectCard + both grids using ProjectCard)

Plan:
1) Normalize grid stretching (both active and previous project grids)
- Keep the existing 3-column template.
- Explicitly add stretch behavior to grid containers (`items-stretch`, and `auto-rows-fr` if needed) so each cell in a row shares equal height.
- Keep `ProjectCard` root as `h-full flex flex-col`.

2) Refactor ProjectCard into a fixed 5-zone internal skeleton
- Replace the variable vertical flow with a strict zone wrapper inside the card body.
- Use fixed-height rows (not content-driven rows) in this exact order:
  1. Header zone (image + name + badges) with reserved height sized for two badge lines
  2. Description zone (always 1 line, ellipsis)
  3. Rotation status zone (always 1 line reserved)
  4. Personnel zone (always 1 line row reserved / fixed row height)
  5. Footer zone (always 1 line reserved)

3) Reserve space even when data is missing
- Always render all 5 zones.
- If a zone has no real content, render an empty placeholder container (no visible text) so its height remains occupied.
- This removes height variance from missing rotation/location/etc.

4) Header badge rail stabilization
- Keep separate on/off rotation badges.
- Place badges within a reserved two-line badge area in the header so recurring and non-recurring cards consume the same header height.
- Ensure posted/shift badges live inside the same header badge area without expanding card height.

5) One-line enforcement where required
- Description: `line-clamp-1` / `truncate`.
- Rotation info: single-line container with truncation as needed.
- Footer: single-line layout (start/end/location) with no wrapping that increases row height.

Technical details:
- The fix is structural, not data-related.
- Equal row height comes from both levels together:
  - Grid level: stretch cells consistently.
  - Card level: fixed zone heights + `h-full`.
- A fixed row template (or equivalent fixed-height zone classes) will be used so all card variants (standard, recurring, shift, posted) render the same overall height by construction.

Acceptance criteria:
- In both “All Projects” and “Previous Projects”, cards in the same row are identical height.
- Cards no longer grow/shrink based on rotation badges, rotation status text, personnel variant, or missing location.
- Layout remains 3-column with consistent gutters and no card width stretching in short rows.
