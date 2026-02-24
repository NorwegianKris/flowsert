
## Consistent Accept/Decline Color Coding Across the System

**Risk: GREEN** -- purely UI styling, no DB/auth/RLS changes.

### The Standard Pattern

All accept/decline actions will follow these consistent styles:

- **Accept button**: `text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700` (green)
- **Decline/Reject button**: `text-red-600 hover:bg-red-50 hover:text-red-700` (red)
- **Accept full button** (in dialogs): `bg-emerald-600 text-white hover:bg-emerald-700`
- **Decline full button** (in dialogs): `variant="outline"` with `text-red-600 hover:text-red-700`

### Files to Update

**1. `src/components/PersonnelInvitations.tsx`** (Worker-side invitation accept/decline)

- **Inline buttons (lines 102-120)**: Change the Decline button from `text-destructive hover:text-destructive` to `text-red-600 hover:bg-red-50 hover:text-red-700`. Change Accept button from default primary to `bg-emerald-600 text-white hover:bg-emerald-700`.
- **Dialog footer (lines 266-281)**: Same changes -- Decline gets red styling, Accept gets green styling.

**2. `src/components/ProjectApplicationsList.tsx`** (Admin-side application accept/reject)

- **Dialog footer (lines 161-176)**: Change Reject from `text-destructive hover:text-destructive` to `text-red-600 hover:text-red-700`. Change Accept from default primary to `bg-emerald-600 text-white hover:bg-emerald-700`.
- Inline buttons already use the correct green/red pattern -- no changes needed there.

**3. `src/components/InvitationLog.tsx`** (Admin invitation status management)

- **Dropdown items (lines 227-250)**: Already uses `text-green-600` and `text-red-600` which is consistent. Normalize to `text-emerald-600` and `text-red-600` for exact consistency with the other components.

### Summary

3 files updated for visual consistency. All accept actions become emerald green, all decline/reject actions become red. The pattern from `ProjectApplicationsList` inline buttons is used as the reference standard.
