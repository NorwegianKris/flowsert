

## Merge Search Bar and Toggle Into One Row

Cosmetic only. No schema changes. 🟢

**File: `src/pages/AdminDashboard.tsx`** (lines 603-620)

Combine the search `div` and the `FreelancerFilters` wrapper into a single flex row:

```tsx
<div className="flex items-center gap-4 mb-4">
  <div className="relative flex-1 sm:max-w-80">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
    <Input
      type="text"
      placeholder="Search personnel..."
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      className="pl-10 border-border"
    />
  </div>
  <FreelancerFilters
    personnelFilter={personnelTabFilter}
    onPersonnelFilterChange={setPersonnelTabFilter}
  />
</div>
```

Search takes remaining space (capped at `sm:max-w-80`), toggle sits on the right. One row, no gap.

