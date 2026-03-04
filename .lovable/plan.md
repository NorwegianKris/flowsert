

## Fix Project Card Heights

Cosmetic only. 🟢

### Changes — `src/components/ProjectsTab.tsx` (ProjectCard)

1. **CardContent** (line 241): Change from `space-y-1.5` to `justify-between` so content splits top/bottom within the flex column.
   - `className="flex flex-col flex-1 justify-between"`

2. **Wrap top content** (lines 242–280): Wrap description + personnel row in a `<div className="space-y-1.5">` so they stay grouped at the top.

3. **Personnel row** (line 245): Change `min-h-[28px]` to `h-10` (40px) to match avatar stack height exactly. Both the avatar branch and the "No personnel assigned" branch will occupy the same fixed height.

4. **Date row** (line 282): Stays as-is — `justify-between` on the parent pins it to the bottom automatically.

### File
- `src/components/ProjectsTab.tsx`

