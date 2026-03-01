

## Plan: Move scroll target to the outer TypeMergingPane container

The `data-testid="unmapped-certificates-section"` attribute is currently on the inner "Left Pane: Unmapped Certificates" `div` (line 1326 of `TypeMergingPane.tsx`), which sits inside the three-column layout. This is too deep — the scroll lands partway through the section.

### Change

**`src/components/TypeMergingPane.tsx`**
- Remove `data-testid="unmapped-certificates-section"` from line 1326 (the inner left pane div)
- Add `data-testid="unmapped-certificates-section"` to line 1311 (the outer `<div className="space-y-4">` that wraps the stats line and the three-column layout)

This moves the scroll anchor up so `scrollIntoView` targets the container that includes the "424 unmapped certificates • 55 canonical types" stats line and the full two-column layout below it.

**No changes to `AdminDashboard.tsx`** — the `useEffect` and `scrollIntoView` call remain identical since they query the same `data-testid`.

### Files changed
- `src/components/TypeMergingPane.tsx` — move attribute from line 1326 to line 1311 (2 lines)

### Not changed
- AdminDashboard scroll logic, visual design, grid layout, any other component

