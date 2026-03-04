

## Fix Project Card Internal Spacing

Cosmetic only. 🟢

### Changes — `src/components/ProjectsTab.tsx`

1. **CardContent container** (line 241): Add `space-y-1.5` and remove individual margin classes from child rows.
   - `className="flex flex-col flex-1 space-y-1.5"`

2. **Description** (line 242): Remove `mb-3` → no class needed.

3. **Personnel row** (line 245): Remove `mb-2` → keep `min-h-[28px]`.

4. **Date row** (line 282): Remove `mt-2` → no class needed.

This gives every row uniform 6px (`1.5 * 4px`) vertical spacing.

### File
- `src/components/ProjectsTab.tsx`

