

## Fix Project Grid Consistency

### Problem
1. Shift groups render in their own separate grid containers, creating inconsistent column widths vs standalone cards
2. Previous Projects section styling differs slightly from All Projects
3. InvitationLog has its own Card wrapper with slightly different header structure

### Changes

#### `src/components/ProjectsTab.tsx`

**Unified grid**: Merge shift group cards and standalone cards into a single `grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4` container instead of having separate grids per shift group + another for standalone. This ensures all cards share the same column template and gutters.

Lines 156-198 — replace the two separate grid sections (shift groups loop + standalone grid) with one unified grid:
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
  {shiftGroups.flatMap(group => group.projects.map(project => (
    <ProjectCard key={project.id} project={project} ... groupColor={group.color} />
  )))}
  {standaloneProjects.map(project => (
    <ProjectCard key={project.id} project={project} ... />
  ))}
</div>
```

**Previous Projects section** (lines 202-233): Change from wrapping the Collapsible inside a Card to matching the All Projects pattern — use `Card > CardContent > header div + Collapsible grid`. Update header to use same `div` with icon + title pattern instead of CollapsibleTrigger as header.

Specifically:
- Move CollapsibleTrigger to be the header row inside CardContent (matching the `flex items-center gap-2 mb-4` pattern of All Projects)
- Keep chevron + badge
- Grid inside CollapsibleContent uses same `grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4`

#### `src/components/InvitationLog.tsx`

**Match section styling**: The InvitationLog already uses `Card className="border-border/50"` which matches. Update the header structure:
- Change `CardHeader` trigger to a simpler `div` header inside `CardContent className="p-6"` matching the All Projects/Previous Projects pattern
- Use same `flex items-center gap-2 mb-4` header with icon + title + badge + chevron
- Remove the separate `CardHeader` for filters, put filters inside CollapsibleContent

### Files changed
- `src/components/ProjectsTab.tsx` — unified grid, updated Previous Projects header
- `src/components/InvitationLog.tsx` — matched section styling

