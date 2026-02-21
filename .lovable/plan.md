

## Match Personnel View Toggle Color Scheme to Posted Projects Toggle

**Risk: GREEN** -- purely UI styling change.

### Current State

- **Posted Projects toggle** (`ProjectsTab.tsx`): Uses lavender/purple styling -- `bg-[#C4B5FD]/10` background with `border-[#C4B5FD]/50` border
- **Personnel view toggle** (`FreelancerFilters.tsx`): Uses neutral gray styling -- `bg-muted/50` background with `border-border` border

### Change

**File: `src/components/FreelancerFilters.tsx`** (line 45)

Update the container's className from:
```
bg-muted/50 rounded-lg border border-border
```
to:
```
bg-[#C4B5FD]/10 rounded-lg border border-[#C4B5FD]/50
```

This single class change aligns the Personnel view toggle bar with the Posted Projects toggle's lavender color scheme.
