

## Fix: Duplicate Content + Reposition AI Button

### Problem 1: Duplicate content
`AdminDashboard` renders both `IssuerTypesManager` and `IssuerMergingPane` separately. But `IssuerTypesManager` already renders `IssuerMergingPane` inside its "Group Issuers" tab — causing the entire merging pane to appear twice.

**Fix**: Remove the standalone `<IssuerMergingPane />` from `AdminDashboard.tsx` (line 927). Keep only `<IssuerTypesManager />` which already contains it.

### Problem 2: AI Group Issuers button position
Currently the button sits in the top status bar (line 398-408). User wants it directly above the arrow circle in the center action pane.

**Fix in `IssuerMergingPane.tsx`**:
- Remove the AI button from the status bar area (lines 398-408)
- Add it in the center pane (line 662), right above the `ArrowRight` circle button — as the first element inside the center flex column

### Files changed

| File | Change |
|------|--------|
| `src/pages/AdminDashboard.tsx` | Remove `IssuerMergingPane` import and usage (lines 19, 927) |
| `src/components/IssuerMergingPane.tsx` | Move AI button from status bar to center pane above arrow |

