

## Fix: Toggle Click Still Opening Profile + Default to "Invite"

**Risk: GREEN** -- pure UI bug fix, no DB/auth/RLS changes.

**Single file:** `src/components/AddProjectDialog.tsx`

### Root Cause

Radix `ToggleGroupItem` uses internal pointer events that bubble past `stopPropagation` on the wrapper div. The row's `onClick={() => setPreviewPersonnel(person)}` (line 1127) still fires.

### Fix 1: Use a ref-based click guard on the row (lines 1124-1127)

Instead of relying on `stopPropagation` (which Radix bypasses), change the row's `onClick` to check whether the click originated inside the toggle area using a ref:

```tsx
// Add a ref to the toggle wrapper
const toggleRef = useRef<HTMLDivElement>(null);

// On the row div:
onClick={(e) => {
  // Don't open profile if click came from inside the toggle
  if (toggleRef.current?.contains(e.target as Node)) return;
  setPreviewPersonnel(person);
}}
```

Since we're inside a `.map()`, we can't use a single ref. Instead, we'll use an inline approach: give the toggle wrapper a `data-toggle` attribute and check for it in the row click:

```tsx
// Row (line 1127):
onClick={(e) => {
  if ((e.target as HTMLElement).closest('[data-toggle-mode]')) return;
  setPreviewPersonnel(person);
}}

// Toggle wrapper (line 1176):
<div data-toggle-mode onClick={(e) => e.stopPropagation()} ...>
```

This is bulletproof -- any click inside the toggle area (regardless of Radix internal event handling) will be detected by `closest()` and the profile won't open.

### Fix 2: Default toggle to "invite" when selecting via checkbox

The `togglePersonnel` function (line 279) already defaults to `mode: 'invite'` -- this is correct. The `ToggleGroup` value is `selected ? mode : undefined`, meaning unselected persons show no active toggle. When clicking the checkbox to select, the person gets `mode: 'invite'` and the "Invite" toggle item will appear active.

No additional changes needed for this part -- the default is already `'invite'`.

### Summary of changes

1. **Line 1127**: Replace `onClick={() => setPreviewPersonnel(person)}` with a guarded version that checks `closest('[data-toggle-mode]')`
2. **Line 1176**: Add `data-toggle-mode` attribute to the toggle wrapper div
3. Keep all existing `stopPropagation` handlers as a secondary safety net

