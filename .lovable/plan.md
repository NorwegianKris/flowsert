

## Four Fixes in TypeMergingPane

**Risk: GREEN** — Pure UI styling. No schema, no edge functions, no access control.

### Fix 1 — Suggestions list must scroll fully

The `ScrollArea` at line 972 uses `className="flex-1"` but without height constraints it won't scroll. The parent `renderSuggestionsList` div (line 926) needs `overflow-hidden` and the absolute container at line 1485 needs `h-full overflow-hidden` so the flex layout constrains properly.

**Changes:**
- Line 926: `"flex flex-col h-full"` → `"flex flex-col h-full overflow-hidden"`
- Line 1489: Add `h-full overflow-hidden` to the list view absolute div's children wrapper

### Fix 2 — Solid confidence pills

Update `getConfidencePillClass` (lines 101-112):
- `high`: `"bg-teal-600 text-white border-teal-600"`
- `medium`: `"bg-amber-500 text-white border-amber-500"`
- `low`: `"bg-gray-400 text-white border-gray-400"`
- default: `"bg-primary text-primary-foreground border-primary"`

### Fix 3 — Column proportions via flex

Replace grid layout (lines 1292-1296) with flex:
```
<div className="flex flex-col lg:flex-row gap-4 lg:gap-0">
```
- Left pane (line 1298): add `style={{ flex: "0 0 35%" }}`
- Middle column (lines 1482, 1503): add `style={{ flex: "0 0 28%" }}`
- Right pane (line 1582): add `style={{ flex: "0 0 37%" }}`

Remove `truncate` from right pane type name (line 1653) and description (line 1659). Add `whitespace-normal` to allow wrapping.

### Fix 4 — Consistent suggestion row padding and pill alignment

Already mostly correct at lines 986-1004. Ensure:
- Each suggestion row has `p-3` (already set line 988)
- Line 994: `justify-between` is already on the top row div — confirmed correct
- The confidence Badge (lines 998-1003) has `shrink-0` — confirmed correct
- Personnel name span (line 995) has `truncate` to prevent it pushing the pill off — confirmed correct

No changes needed for Fix 4, the layout is already correct per the code.

### Files changed

- `src/components/TypeMergingPane.tsx` — fixes 1-3

