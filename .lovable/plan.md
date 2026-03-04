

## Dynamic Section Title Based on Toggle Filter

Cosmetic only. 🟢

### Change

In `src/components/ProjectsTab.tsx`, make the "Active & Upcoming Projects" heading dynamic based on `projectFilter`:

Map filter values to titles:
- `all` → "All Projects"
- `active` → "Active Projects"
- `recurring` → "Recurring Projects"
- `posted` → "Posted Projects"

Replace the static `<h2>Active & Upcoming Projects</h2>` with the mapped title. One small code change, no other files affected.

