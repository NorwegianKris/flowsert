
## Prompt Risk Assessment: 🟢 Anchor Optional
Pure UI changes -- icon sizing and tab removal. No database, auth, or access control changes.

---

## Overview
Two changes in `src/components/ProjectDetail.tsx`: fix the Documents tab icon size and remove the Calendar tab entirely.

---

## Changes

### 1. Fix Documents tab icon
The `FileText` icon at `h-4 w-4` is rendering too small compared to the other tab icons. Increase it to `h-5 w-5` to match the visual weight of `Users` and `Calendar`. Also, since `FileText` is already used for the "Project Information" section header (line 463) with `h-5 w-5`, using the same size keeps things consistent.

**Line 345**: Change `h-4 w-4` to `h-5 w-5` on the FileText icon.

### 2. Remove Calendar tab
Remove the Calendar tab trigger (lines 340-343), the Calendar TabsContent (lines 392-446), and change the grid from `grid-cols-3` to `grid-cols-2` (line 335). Also remove the `AddCalendarItemDialog` button if it's tied to this tab, and clean up unused imports (`Calendar`, `Flag`, `XCircle` if only used in the calendar section).

---

## Technical Details

**File:** `src/components/ProjectDetail.tsx`

- **Line 335**: Change `grid-cols-3` to `grid-cols-2` in TabsList
- **Lines 340-343**: Remove the Calendar TabsTrigger
- **Line 345**: Change `FileText` icon from `h-4 w-4` to `h-5 w-5`
- **Lines 392-446**: Remove the entire Calendar TabsContent block
- Clean up any imports that are no longer used after removing the calendar tab (`Calendar`, `Flag`, `XCircle` if not used elsewhere, `AddCalendarItemDialog`)
