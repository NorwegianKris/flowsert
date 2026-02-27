

## Plan: Add search field to Projects tab

### Single file change — `src/components/ProjectsTab.tsx`

1. Add a search input with a Search icon above the filter bar (same pattern as the personnel search in AdminDashboard)
2. Add `searchQuery` state
3. Apply the search filter to `projects` before splitting into active/completed, so results appear regardless of status/posted/recurring flags
4. Search matches against project name, description, and location fields (case-insensitive)
5. Import `Search` from lucide-react and `Input` from ui/input

The search field will sit at the top of the tab, before the "Project view" filter bar, using the same `pl-10` padded input with a search icon overlay pattern used in AdminDashboard.

### Risk
- Pure UI filtering — no anchor required

