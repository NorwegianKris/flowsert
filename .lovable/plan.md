

# Consistent Employee/Freelancer Badge Colors

The PersonnelCard in the admin dashboard is the canonical source. It uses:
- **Employee** → `variant="default"` (indigo/primary)
- **Freelancer** → `variant="secondary"` (dark slate)

Five files have inconsistent styling. Here are the fixes:

---

## File 1: `src/components/project-timeline/PersonnelGroup.tsx` (line 56)

**Problem**: Variants are reversed — freelancer uses `default`, employee uses `secondary`.

**Fix**: Swap to `person.category === 'freelancer' ? 'secondary' : 'default'`

---

## File 2: `src/components/WorkerGroupsManageList.tsx` (line 203)

**Problem**: Uses `variant="outline"` for both categories.

**Fix**: Change to `variant={person.category === 'freelancer' ? 'secondary' : 'default'}`

---

## File 3: `src/components/DataAcknowledgementsManager.tsx` (line 157)

**Problem**: Uses `variant="outline"` for both categories.

**Fix**: Change to `variant={p.category === 'freelancer' ? 'secondary' : 'default'}`

---

## File 4: `src/components/SendNotificationDialog.tsx` (line 364)

**Problem**: Uses `variant="secondary"` but overrides with custom `bg-lavender-100 text-lavender-700` classes (which likely don't resolve to anything in the Tailwind config).

**Fix**: Remove the custom color classes, keep `variant="secondary" className="text-xs shrink-0"`

---

## File 5: `src/components/ExternalSharingDialog.tsx` (line 950)

**Status**: Already correct — `variant="secondary"` for freelancer. No change needed.

---

## Already consistent (no changes)

- `PersonnelCard.tsx` — canonical source
- `PersonnelPreviewSheet.tsx` — correct
- `RecentRegistrations.tsx` — correct

## Risk
UI-only. No database, RLS, auth, or edge function changes.

