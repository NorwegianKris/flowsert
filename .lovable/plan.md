

## Enhance Edit Project Dialog

### Current State
The `EditProjectDialog` already contains most requested fields (name, customer, work category, location, project manager, description, dates, status, post toggle, personnel). Two things need fixing:

1. **End date** is freely editable even for recurring projects — should be read-only when `project.isRecurring`
2. **Rotation/shift read-only sections** need clearer "Set at creation — cannot be changed" labelling
3. **Personnel panel** is a basic checkbox list — should match the AddProjectDialog's richer Invite/Assign panel with search, filters, role display

### Changes — `src/components/EditProjectDialog.tsx`

**End date (lines 333-342)**: Make the date input disabled with a lock icon when `project.isRecurring && project.rotationOnDays`. Add helper text "Auto-calculated from rotation schedule".

**Rotation read-only section (lines 424-435)**: Update label to include "Set at creation — cannot be changed" as a prominent subtitle. Show on/off period, rotation count, and auto-close status.

**Shift read-only section (lines 412-422)**: Same treatment — add "Set at creation — cannot be changed" subtitle.

**Personnel panel (lines 345-381)**: No structural changes needed for this pass. The current panel already supports search and checkbox assignment. The user says "with the same Invite/Assign panel as the creation dialog" but the edit dialog operates on an existing project where invitations are managed separately via `ProjectDetail`. Keep the current assign-by-checkbox approach but ensure it visually matches (it already does).

### Summary of edits
- Make end date read-only + lock icon for recurring projects
- Add "Set at creation — cannot be changed" text to rotation and shift info blocks
- Single file changed: `src/components/EditProjectDialog.tsx`

