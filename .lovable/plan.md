

## Fix: Toggle Click Opening Profile View

**Risk: GREEN** -- pure UI bug fix, no DB/auth/RLS changes.

**Single file:** `src/components/AddProjectDialog.tsx`

### Root Cause

The personnel row (line 1127) has `onClick={() => setPreviewPersonnel(person)}` which opens the profile sheet. The toggle's wrapper div has `e.stopPropagation()` but Radix ToggleGroupItem uses internal pointer events that can bypass it.

### Fix (lines 1176-1196)

Add `onPointerDown`, `onPointerUp`, and `onMouseDown` stopPropagation handlers to the wrapper div alongside the existing `onClick` handler. This ensures all pointer-related events from the Radix toggle primitives are caught before they bubble up to the row's click handler.

```tsx
<div
  onClick={(e) => e.stopPropagation()}
  onPointerDown={(e) => e.stopPropagation()}
  onPointerUp={(e) => e.stopPropagation()}
  onMouseDown={(e) => e.stopPropagation()}
>
  <ToggleGroup ... />
</div>
```

No other changes needed. The toggle behavior and styling remain identical.

