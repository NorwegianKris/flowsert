

## Equal-Height Project Cards

CSS Grid already makes items in the same row equal height — the issue is the `Card` component inside each grid cell isn't stretching to fill its cell. The grid containers need `items-stretch` (default) but each `Card` needs `h-full` to fill the cell.

### Changes — `src/components/ProjectsTab.tsx`

1. **Shift group grid (line 162)**: Already has `grid` — no change needed, grid stretches by default.

2. **Standalone grid (line 181)**: Same — already correct.

3. **Completed projects grid (line 210-ish)**: Same.

4. **ProjectCard root `<Card>` (line 298-299)**: Add `h-full` to the className so it stretches to fill its grid cell. The card already has `flex flex-col` so content aligns top, empty space goes to bottom.

Single line change — add `h-full` to the Card className on line 299.

### File changed
- `src/components/ProjectsTab.tsx` — add `h-full` to ProjectCard's root Card element

