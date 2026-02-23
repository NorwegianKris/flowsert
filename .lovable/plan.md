

## Fix: Toggle Click Opening Profile Sidebar (Take 4)

**Risk: GREEN** -- pure UI event handling fix, no DB/auth/RLS changes.

**Single file:** `src/components/AddProjectDialog.tsx`

### Root Cause

All previous attempts relied on `stopPropagation` and `closest()` checks, but Radix UI's `ToggleGroupItem` uses complex internal pointer/focus event handling that can bypass these techniques. The click on the toggle still reaches the row's `onClick` handler.

### New Approach: Move the click target instead of blocking propagation

Instead of putting `onClick` on the entire row div (line 1124) and trying to block it from the toggle, **remove `onClick` from the row entirely** and instead put the `setPreviewPersonnel` handler only on the name/info area that should actually open the profile.

**Changes:**

1. **Line 1127**: Remove the `onClick` handler from the row `<div>` entirely (revert to no click handler on the outer div).

2. **Lines 1143-1178 (the name/info `<div>`)**: Add `onClick={() => setPreviewPersonnel(person)}` and `className="cursor-pointer"` to the `<div className="flex-1 min-w-0">` element that contains the person's name and role. This is the area users naturally click to view a profile.

3. **Line 1126**: Remove `cursor-pointer` from the row's className since the row itself is no longer clickable for profile opening.

This approach is bulletproof because the toggle and the profile-opening area are now **separate sibling elements** with independent click handlers -- no event propagation conflict is possible.

### Technical detail

```
Row div (no onClick)
  |-- Checkbox (has its own onClick)
  |-- Avatar
  |-- Name/Role div  -->  onClick={() => setPreviewPersonnel(person)}
  |-- Toggle div     -->  ToggleGroup (completely independent)
```

The toggle wrapper keeps its existing `stopPropagation` handlers as a safety net, and the `data-toggle-mode` attribute can be removed since it's no longer needed.

