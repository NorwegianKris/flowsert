

## Prompt Risk Assessment: 🟢 Anchor Optional
All four changes are purely UI text, layout, and styling. No database, auth, or access control changes involved.

---

## Overview
Four minor UI consistency and text updates across the admin dashboard.

---

## Changes

### 1. Purple "Get Suggestions" button in New Project dialog
**File:** `src/components/AddProjectDialog.tsx` (line ~513)

Add a purple background class to the "Get Suggestions" button, matching the brand primary color. Change to `variant="default"` or add `className="bg-primary ..."` to ensure it renders in the brand purple.

### 2. Reorder certificate filter toggle: Categories - Types - Issuers
**File:** `src/components/PersonnelFilters.tsx` (lines ~365-388)

Swap the order of the ToggleGroupItems so "Categories" appears first, then "Types", then "Issuers". Also update the default `certificateFilterMode` state in `AdminDashboard.tsx` and `AddProjectDialog.tsx` from `'types'` to `'categories'`.

### 3. Update text in Settings > Categories
**File:** `src/components/CategoriesSection.tsx` (line ~61)

Change:
> "Define job role categories for personnel. These will appear as options when adding new workers."

To:
> "Define job role categories for personnel. These will appear as options when new workers are added or registers."

### 4. Align center action areas between Worker Group Merging and Type Merging panes

**Two reciprocal changes:**

**a) WorkerGroupMergingPane.tsx** -- Replace the single purple circle arrow button with a layout matching TypeMergingPane's center area:
- Add explanatory text: "Select personnel on the left, then group them into a worker group on the right."
- Replace the single arrow button with two buttons: "Group into Selected" and "Create & Group"
- Keep the purple circle arrow icon styling (for consistency, see next point)

**b) TypeMergingPane.tsx** (lines ~656-701) -- Replace the plain `ArrowRight` icon with a purple circle button matching WorkerGroupMergingPane's current styling:
- Replace the standalone arrow icon with a `rounded-full bg-primary text-primary-foreground` circular button containing the white arrow
- Keep the explanatory text and two action buttons as they already are

This makes both merging panes consistent: purple circle arrow at top, explanatory text, and two action buttons ("Group into Selected" / "Create & Group").

---

## Technical Details

- **AddProjectDialog.tsx**: The "Get Suggestions" Button already uses `variant="default"` which maps to `bg-primary` (the brand purple). Need to verify if any override is removing the purple -- if it already renders purple, no change needed. If not, explicitly add the primary class.
- **PersonnelFilters.tsx**: Reorder the three `ToggleGroupItem` JSX elements (Categories first, Types second, Issuers third).
- **CategoriesSection.tsx**: Single text string replacement.
- **WorkerGroupMergingPane.tsx**: Add `Check`, `Plus` icon imports; add explanatory text div and two Button components; restructure center column layout.
- **TypeMergingPane.tsx**: Wrap the ArrowRight in a `Button` with `size="icon"` and `className="rounded-full"` to match the purple circle style.

