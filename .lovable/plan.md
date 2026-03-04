

## Widen Search/Label Bars Across All Tabs

Cosmetic only. No schema changes. 🟢

### Problem
`max-w-80` (320px) is too narrow — the Projects placeholder text gets truncated.

### Fix
Change `max-w-80` to `max-w-96` (384px) in all three places:

1. **`src/components/ProjectsTab.tsx` (line 70)**: `max-w-80` → `max-w-96`
2. **`src/pages/AdminDashboard.tsx` (Personnel search bar, ~line 617)**: `max-w-80` → `max-w-96`
3. **`src/pages/AdminDashboard.tsx` (Overview static label, ~line 726)**: `max-w-80` → `max-w-96`

384px comfortably fits the full placeholder text with the search icon padding.

