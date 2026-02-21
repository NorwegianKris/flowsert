

## Fix Active Badge to Green in Project Detail View

**Risk: GREEN** -- purely UI styling change.

### Problem

The `statusConfig` in `ProjectDetail.tsx` still uses `variant: 'default'` for active projects, which renders as indigo/purple. It should use `variant: 'active'` to render green, matching the project cards.

### Change

**File: `src/components/ProjectDetail.tsx`** (lines 58-61)

Update `statusConfig`:

```tsx
const statusConfig = {
  active: { label: 'Active', variant: 'active' as const, icon: Clock, color: 'bg-active' },
  completed: { label: 'Completed', variant: 'completed' as const, icon: CheckCircle, color: 'bg-muted-foreground' },
  pending: { label: 'Pending', variant: 'outline' as const, icon: Clock, color: 'bg-amber-500' },
};
```

Also update the icon color logic (around line 205) to handle the new `bg-active` color value:

```tsx
<StatusIcon className={`h-12 w-12 ${config.color === 'bg-active' ? 'text-active' : config.color === 'bg-muted-foreground' ? 'text-muted-foreground' : 'text-amber-500'}`} />
```

Two small edits in one file.
