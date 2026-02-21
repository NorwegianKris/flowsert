

## Fix: Add Event/Milestone Button Not Working

**Risk: GREEN** -- single file UI fix, no database or backend changes.

### Root Cause

The `AddCalendarItemDialog` component exists but is never rendered in `ProjectDetail.tsx`. The button sets `isAddItemOpen` to `true`, but there's no dialog listening to that state.

### Fix

**File: `src/components/ProjectDetail.tsx`**

1. Add import for `AddCalendarItemDialog` (line 10, next to `AddPhaseDialog`)
2. Render the dialog just before `<AddPhaseDialog>` (around line 481):

```tsx
<AddCalendarItemDialog
  open={isAddItemOpen}
  onOpenChange={setIsAddItemOpen}
  onAdd={handleAddCalendarItem}
  projectStartDate={project.startDate}
  projectEndDate={project.endDate}
/>
```

No other files need changes -- the state (`isAddItemOpen`), handler (`handleAddCalendarItem`), and dialog component (`AddCalendarItemDialog.tsx`) all already exist.

