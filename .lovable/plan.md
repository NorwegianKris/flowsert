

## White Background for Application Message in Detail Popup

**Risk: GREEN** -- purely UI styling, no DB/auth/RLS changes.

### Single file: `src/components/ProjectApplicationsList.tsx`

### Change

**Line 146**: Update the application message container background from gray (`bg-muted/50`) to white with a border.

```tsx
// Before
<div className="rounded-lg bg-muted/50 p-3">

// After
<div className="rounded-lg bg-white dark:bg-card border border-border p-3">
```

This matches the same white styling already applied to the application rows in the list view.

