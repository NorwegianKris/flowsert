
# Remove Personnel Tab and Add Edit/Delete to Activation Overview

## What Changes

1. **Remove the Personnel tab** from the Settings Tabs component -- the Admins/Personnel toggle becomes just the Admins card (no tabs needed, or keep as single content).

2. **Add Edit and Delete buttons** to each profile row in the Activation Overview, matching the style already used in PersonnelOverview (ghost icon buttons).

3. **Add delete confirmation dialog** to ActivationOverview (reuse the same pattern from PersonnelOverview).

## Files to Change

### 1. `src/pages/AdminDashboard.tsx`
- Remove the `<Tabs>` wrapper and the Personnel tab entirely
- Render `<AdminOverview />` directly (no tabs needed since there's only one section left)
- Remove the `PersonnelOverview` import
- Pass `onEditPersonnel` and `onPersonnelRemoved` callbacks to `<ActivationOverview>` instead

### 2. `src/components/ActivationOverview.tsx`
- Add `onEditPersonnel` and `onPersonnelRemoved` optional props
- Add Edit (pencil) and Delete (trash) icon buttons to each personnel row, positioned before the Active/Inactive toggle
- Add a delete confirmation AlertDialog (same pattern as PersonnelOverview -- confirms removal, calls `supabase.from('personnel').delete()`)
- Import `Pencil`, `Trash2`, `Loader2` icons and AlertDialog components

### 3. `src/components/PersonnelOverview.tsx`
- No changes needed, but it will no longer be used in AdminDashboard. It can be kept for potential use elsewhere or removed.

## Technical Details

The edit button will call `onEditPersonnel(person)` which closes Settings and opens the edit dialog (same flow as before). The delete button opens a confirmation dialog within the ActivationOverview component, then calls `onPersonnelRemoved()` on success to refresh the list.

The Settings layout simplifies from:
```
[Company Card button]
[Admins | Personnel tabs]
[Activation Overview]
```
To:
```
[Company Card button]
[Admin Overview card]
[Activation Overview card (with edit/delete)]
```
