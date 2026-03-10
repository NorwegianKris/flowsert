

## Two Visual Fixes for Shift Group Cards

### FIX 1 — Remove left connector line (line 162-163)
Remove `pl-3` padding and `borderLeft` style from the shift group container div.

```tsx
// Before
className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pl-3"
style={{ borderLeft: '1px dashed #cbd5e1' }}

// After
className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
```

### FIX 2 — Match shift badge to rotation badge style (lines 333-341)
The rotation badge uses: `bg-teal-500/20 text-teal-700 dark:text-teal-300 border-teal-500/50`. Replace the solid white-on-color shift badge with the same soft tinted style, using `groupColor` when available or teal as fallback.

```tsx
// Before
<Badge
  className="border-border/50"
  style={{ backgroundColor: groupColor || '#3B3AC2', color: '#ffffff', borderColor: groupColor || '#3B3AC2' }}
>

// After — when groupColor is set, use 20% opacity bg + full color text; otherwise match teal
<Badge
  className={groupColor ? '' : 'bg-teal-500/20 text-teal-700 dark:text-teal-300 border-teal-500/50'}
  style={groupColor ? { backgroundColor: `${groupColor}33`, color: groupColor, borderColor: `${groupColor}80` } : undefined}
>
```

### File changed
- `src/components/ProjectsTab.tsx` — two small edits

