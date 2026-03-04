
## Fix Search/Label Bar Widths to Match Projects Tab

Cosmetic only. No schema changes. 🟢

### Problem
All three bars have `max-w-96`, but the Personnel and Overview bars are inside `flex` containers where they shrink to content size instead of expanding to fill up to 384px like the standalone Projects bar does.

### Fix
Add `w-full` to the two flex-child wrappers so they expand to `max-w-96`:

1. **`src/pages/AdminDashboard.tsx` (~line 617)**: `"relative max-w-96"` → `"relative w-full max-w-96"`
2. **`src/pages/AdminDashboard.tsx` (~line 726)**: `"relative max-w-96"` → `"relative w-full max-w-96"`

No change to ProjectsTab — it's already the reference width.
