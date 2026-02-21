

## Prompt Risk Assessment: 🟢 Anchor Optional
All changes are purely UI text, layout, and styling. No database, auth, or access control changes.

---

## Overview
Four minor UI updates: show Next of Kin for freelancers, update login text, add search bar in Edit Project personnel list, and align Post Project section styling.

---

## Changes

### 1. Show Next of Kin for freelancer profiles
**Files:** `src/components/PersonnelDetail.tsx` (line ~517), `src/components/EditPersonnelDialog.tsx` (line ~457)

Remove the `{personnel.category !== 'freelancer' && ...}` / `{!isFreelancer && ...}` condition wrapping the Next of Kin section so it displays for all personnel types including freelancers.

### 2. Update login popup text
**File:** `src/pages/Auth.tsx` (lines 926-934)

Replace:
> "Registration is by invitation only. Need access? Contact us"

With:
> "Registration is by invitation or company-provided link only."

Remove the "Contact us" link since the new text is self-contained.

### 3. Add search bar in Edit Project Assigned Personnel list
**File:** `src/components/EditProjectDialog.tsx` (lines ~341-365)

Add a search input above the personnel checkbox list that filters personnel by name or role. This requires:
- A new `personnelSearch` state variable
- An `Input` with placeholder "Search personnel..." placed between the Label and the list div
- Filter the `personnel.map()` to only show entries matching the search term

### 4. Lavender styling for Post Project section in Edit Project
**File:** `src/components/EditProjectDialog.tsx` (line 369)

Change the Post Project toggle container from:
```
bg-muted/30 rounded-lg border border-border
```
To match AddProjectDialog's styling:
```
bg-[#C4B5FD]/10 rounded-lg border border-[#C4B5FD]/50
```

This matches the lavender styling already used in `AddProjectDialog.tsx` (line 740).

---

## Technical Details

- **PersonnelDetail.tsx**: Remove conditional on line 517 (`personnel.category !== 'freelancer'`), keep the Card content as-is.
- **EditPersonnelDialog.tsx**: Remove conditional on line 457 (`!isFreelancer`), keep the Next of Kin form fields as-is.
- **Auth.tsx**: Replace lines 926-934 with a simple `<p>` containing the new text, no link needed.
- **EditProjectDialog.tsx**: Add `useState` for `personnelSearch`, add `Input` component (already imported), filter personnel list with `.filter(p => p.name.toLowerCase().includes(...) || p.role.toLowerCase().includes(...))`. Update the Post Project div classes on line 369.
