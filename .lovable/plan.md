

## Style Sort Control and Clean Up Filters

Cosmetic only. 🟢

### Changes

**`src/components/PersonnelFilters.tsx`**
1. **Sort button styling** — Change from `variant="outline"` to `bg-primary text-primary-foreground hover:bg-primary/90` with white chevron. Push it to the far right with `ml-auto`.
2. **Remove any remaining "Workers" filter** — Already removed in prior changes; confirm no remnants exist.

**`src/pages/AdminDashboard.tsx`**
3. **Default sort** — Change `useState<PersonnelSortOption>('last_updated')` to `useState<PersonnelSortOption>('alphabetical')`.

