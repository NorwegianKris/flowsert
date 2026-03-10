

## Add Status Badge for Non-Recurring Project Cards

### What
Add a status badge (Active/Completed/Pending) to non-recurring, non-posted project cards so every card has at least one badge in the badge rail.

### Changes — `src/components/ProjectsTab.tsx`

**1. Expand `statusConfig` (line 21-25)** to include badge color classes:
```ts
const statusConfig = {
  active: { label: 'Active', variant: 'active' as const, icon: Clock, badgeClass: 'bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/50' },
  completed: { label: 'Completed', variant: 'completed' as const, icon: CheckCircle, badgeClass: 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/50' },
  pending: { label: 'Pending', variant: 'outline' as const, icon: Clock, badgeClass: 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/50' },
};
```

**2. Badge rail (lines 309-340)** — after the existing Posted/Recurring/Shift badge blocks, add a new conditional that renders a status badge for non-recurring cards that aren't posted:

```tsx
{/* Status badge for non-recurring, non-posted cards */}
{!project.isRecurring && !isPosted && (
  <Badge className={config.badgeClass}>
    <StatusIcon className="h-3 w-3 mr-1" />
    {config.label}
  </Badge>
)}
```

This uses the already-extracted `config` and `StatusIcon` variables (line 240-241) which are currently unused in the card UI.

### What stays unchanged
- Recurring project badges (rotation on/off, shift) — untouched
- Posted badge — untouched  
- Card structure, zones, heights — untouched

### File
- `src/components/ProjectsTab.tsx`

