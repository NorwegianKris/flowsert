

## Two Toggle Position Fixes

Cosmetic only. No schema changes. 🟢

### Changes in `src/pages/AdminDashboard.tsx`

**1. Personnel tab (line 616):** Change `flex items-center gap-4` to `flex items-center justify-between gap-4` so the search bar sits left and the toggle is pushed far right.

**2. Overview tab (line 725):** Change `sm:items-start` to `sm:items-center` so the toggle vertically centers relative to the stat cards row.

| Line | Current | New |
|---|---|---|
| 616 | `flex items-center gap-4 mb-4` | `flex items-center justify-between gap-4 mb-4` |
| 725 | `flex flex-col sm:flex-row sm:items-start gap-4` | `flex flex-col sm:flex-row sm:items-center gap-4` |

Two class changes, same file.

