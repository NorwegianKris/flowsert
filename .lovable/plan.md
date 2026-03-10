

## Two Visual Fixes for Shift Group Cards

### FIX 1 — Group connector line (line 162-163 in ProjectsTab.tsx)
Change the `3px solid` border to a `1px dashed` light grey border for a subtler grouping hint.

```tsx
// Before
className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pl-3"
style={{ borderLeft: `3px solid ${group.color || '#94a3b8'}` }}

// After
className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pl-3"
style={{ borderLeft: '1px dashed #cbd5e1' }}
```

### FIX 2 — Shift badge readability (lines 333-340)
Replace the faint translucent badge with a solid background using `groupColor` (or fallback `#3B3AC2`) and white text.

```tsx
// Before
style={groupColor ? { backgroundColor: `${groupColor}33`, color: groupColor, borderColor: `${groupColor}66` } : undefined}

// After
style={{ backgroundColor: groupColor || '#3B3AC2', color: '#ffffff', borderColor: groupColor || '#3B3AC2' }}
```

### File changed
- `src/components/ProjectsTab.tsx` — two small style edits

