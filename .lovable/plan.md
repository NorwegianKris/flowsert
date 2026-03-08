

## Fix: Project Invitation Row Layout

### Problem
The date text sits inline with the project name inside the left column, causing it to be clipped or hidden behind the buttons at certain widths.

### Fix
Restructure the row into two visual rows inside each card, in **both** `PersonnelInvitations.tsx` (lines 79-121) and `PersonnelProjectsTabs.tsx` (lines 229-258):

**Top row:** Folder icon + project name on the left, Decline/Accept buttons on the right (always horizontal via `flex items-center justify-between`).

**Bottom row:** Date text left-aligned below, with a small left padding to align under the project name.

The outer container changes from `flex flex-col sm:flex-row` to `flex flex-col` (always stacked), with two inner rows:

```
Row 1: [icon + name]  ............  [Decline] [Accept]
Row 2: [date text, left-aligned with indent]
```

The date `<div>` moves out of the name block and becomes a sibling below the top row. Buttons stay in the top row always visible. No button logic/style changes.

### Files

| File | Lines | Change |
|------|-------|--------|
| `PersonnelInvitations.tsx` | 79-121 | Restructure row layout |
| `PersonnelProjectsTabs.tsx` | 229-258 | Same restructure |

### Risk
Layout-only. No logic, data, or button styling changes.

