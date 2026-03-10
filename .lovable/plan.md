

## Redesign Back-to-Back Shift Groups in Projects List

### Overview
Replace the collapsible `ShiftGroupCard` with individual `ProjectCard` instances for each shift, rendered adjacently with a visual group connector and color tint. Add a `group_color` column and a color picker in `AddProjectDialog`.

### 1. Database Migration
Add `group_color` column to `projects` table:
```sql
ALTER TABLE public.projects ADD COLUMN group_color text;
```

### 2. `src/hooks/useProjects.ts`
- Add `group_color` to `DbProject` interface
- Add `groupColor?: string` to `Project` interface
- Map `group_color` in `mapDbToProject`
- Include `group_color` in `buildInsertPayload`
- In `addProject` shift creation loop, pass the `groupColor` value to all sibling shift payloads so every shift in the group stores the same color

### 3. `src/components/AddProjectDialog.tsx`
- Add state: `const [shiftGroupColor, setShiftGroupColor] = useState('#94a3b8')` (default slate)
- Add a color picker input inside the `{isBackToBack && (...)}` block, after the "Number of shifts" input:
  ```
  Label: "Shift group colour"
  <input type="color" value={shiftGroupColor} onChange={...} />
  ```
- Pass `groupColor: isShiftMode ? shiftGroupColor : undefined` in the project object at submit time
- Pass `_groupColor` as part of the project payload so the hook can apply it to siblings
- Reset `shiftGroupColor` to default in the form reset function

### 4. `src/components/ProjectsTab.tsx`
**Remove**: `ShiftGroupCard` component, `ShiftGroup` interface, `expandedShiftGroups` state, `toggleShiftGroup` function.

**Replace grouping logic**: Instead of separating shift projects into a separate `shiftGroups` array, merge them back into the main list but keep them adjacent. The `useMemo` will produce a single ordered array where shift-group projects are sorted together by `shiftGroupId` then `shiftNumber`.

**Render**: In the grid, render all projects (standalone + shift) using `ProjectCard`. For shift groups, wrap adjacent shift cards in a container `div` with a left border using the group's color:

```tsx
// For each group of shift cards:
<div 
  className="col-span-full grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
  style={{ borderLeft: `3px solid ${group.color || '#94a3b8'}` paddingLeft: '12px' }}
>
  {group.projects.map(p => (
    <ProjectCard 
      key={p.id} 
      project={p} 
      groupColor={p.groupColor}
      ...
    />
  ))}
</div>
```

**Color tint on ProjectCard**: Add optional `groupColor` prop. When present, apply it as a subtle background:
```tsx
style={{ backgroundColor: groupColor ? `${groupColor}15` : undefined }}
```
This gives ~10% opacity hex tint. The existing card classes remain unchanged.

The shift badge (`Shift 1`, `Shift 2`) already exists on the `ProjectCard` component — no change needed there.

### Files Changed

| File | Change |
|------|--------|
| Migration | Add `group_color text` column to `projects` |
| `src/hooks/useProjects.ts` | Add `groupColor` to interfaces, mapping, and payload |
| `src/components/AddProjectDialog.tsx` | Add color picker state + input, pass to submit |
| `src/components/ProjectsTab.tsx` | Remove `ShiftGroupCard`, render shift cards as standard `ProjectCard` with left-border grouping and color tint |

