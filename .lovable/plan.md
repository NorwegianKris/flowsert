
## Fix: Inactive Toggle Items Should Be Purple with White Text

**Risk: 🟢 GREEN** — CSS-only change.

---

### Problem

Currently the inactive toggle items use the default muted styling (gray-ish), while the active one is white with purple text. The user wants the **inverse**: inactive items should have a **purple background with white text/icons**, and the active item stays white with purple text.

### Solution

**File:** `src/components/ComplianceSnapshot.tsx`

1. Change the `ToggleGroup` container background from `bg-muted/50` to `bg-primary` (purple background for the bar itself, which shows through on inactive items).

2. Add default (inactive) text color `text-white` to each `ToggleGroupItem` so inactive items have white lettering and icons against the purple background.

The active state remains `data-[state=on]:bg-background data-[state=on]:text-primary` (white box, purple text).

Updated classes:
- Container: `bg-primary p-1 rounded-lg shrink-0`
- Each item: `text-white data-[state=on]:bg-background data-[state=on]:text-primary data-[state=on]:shadow-sm px-3 py-1.5 text-sm`

---

### Files Changed

| File | Action | Description |
|------|--------|-------------|
| `src/components/ComplianceSnapshot.tsx` | MODIFY | Purple background on toggle container, white text on inactive items |
