

## Tabbed Crew Assignment for Back-to-Back Shifts

### Overview

When "Set up back-to-back shifts" is enabled in AddProjectDialog, replace the single personnel panel with a tabbed panel — one tab per shift. Each tab maintains its own independent personnel selection list. On submit, each shift's project record receives only its tab's personnel.

### State Changes — `AddProjectDialog.tsx`

Replace the single `personnelSelections` state with a per-shift map:

```typescript
// Replace:
const [personnelSelections, setPersonnelSelections] = useState<PersonnelSelection[]>([]);

// With:
const [personnelSelections, setPersonnelSelections] = useState<PersonnelSelection[]>([]);
const [shiftPersonnelSelections, setShiftPersonnelSelections] = useState<Record<number, PersonnelSelection[]>>({});
const [activeShiftTab, setActiveShiftTab] = useState(1);
```

- `personnelSelections` continues to be used when `isBackToBack` is false (standard mode)
- `shiftPersonnelSelections` is a map `{ 1: [...], 2: [...], 3: [...] }` used when `isBackToBack` is true
- `activeShiftTab` tracks which shift tab is selected

When `shiftCount` changes, trim any entries beyond the new count. When `isBackToBack` is toggled off, clear `shiftPersonnelSelections`.

### Helper Functions

All existing personnel helpers (`togglePersonnel`, `setPersonnelMode`, `selectAllPersonnel`, `deselectAllPersonnel`, `isSelected`, `getPersonnelMode`, `inviteCount`, `assignCount`) will be wrapped to delegate to either `personnelSelections` or `shiftPersonnelSelections[activeShiftTab]` based on `isBackToBack`.

This keeps the personnel list rendering code unchanged — it just reads from different backing state.

### UI — Right Column (lines 999-1498)

When `isBackToBack && isRecurring`:
- Add a `Tabs` component (from `@radix-ui/react-tabs`, already in the project) above the personnel list
- Tab labels: `"{name} — Shift {n}"` (or `"Shift {n}"` if name is empty)
- Number of tabs = `shiftCount`, generated dynamically
- Switching tabs updates `activeShiftTab`, which changes which selection set the helpers read/write
- The personnel list, filters, search, and invite/assign controls remain identical per tab

When `!isBackToBack`:
- Standard single panel, no tabs — unchanged from current behavior

### Submit Logic — `handleSubmit`

When `isBackToBack`:
- Pass `_shiftPersonnel` on the project object (alongside existing `_shiftCount`)
- Format: `{ 1: { assigned: string[], invited: string[] }, 2: { ... }, ... }`
- Shift 1's assigned personnel go on the parent project's `assignedPersonnel`
- After `onProjectAdded` returns, send invitations for shift 1 as currently done

### Hook Changes — `useProjects.ts` → `addProject`

- Read `(project as any)._shiftPersonnel` if present
- For the parent project (shift 1): already uses `project.assignedPersonnel` — no change needed
- For each sibling (shift 2+): replace `assignedPersonnel: []` with `assignedPersonnel: shiftPersonnel[n]?.assigned || []`
- Return all created projects so the dialog can send invitations per shift

### Dialog Post-Submit — Invitations per Shift

After `onProjectAdded` returns the parent project, the dialog needs all sibling project IDs to send invitations. Two options:

**Chosen approach**: Modify `addProject` to return an array of created projects (or attach sibling IDs to the returned project). The dialog then sends invitations for each shift's invited personnel to the corresponding project ID.

Since `addProject` currently returns only the parent `Project`, we'll add a `_createdShifts` property on the returned object containing `{ shiftNumber: number, projectId: string }[]`. The dialog iterates this to send per-shift invitations.

### Reset

`resetForm` clears `shiftPersonnelSelections` and resets `activeShiftTab` to 1.

### Files Changed

| File | Change |
|------|--------|
| `src/components/AddProjectDialog.tsx` | Add shift personnel state, tabbed UI, per-shift submit logic |
| `src/hooks/useProjects.ts` | Read `_shiftPersonnel` for per-shift assigned personnel, return shift project IDs |

