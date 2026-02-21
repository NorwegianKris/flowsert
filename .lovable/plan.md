

## Bug Fixes: 2 Items

All changes are UI-only (no schema, RLS, edge functions, or auth changes).

---

### 1. Notifications Log Scroll Fix

**File:** `src/components/NotificationsLog.tsx`

The dialog has `max-h-[80vh] overflow-hidden` but the content area doesn't properly constrain its height for scrolling. The `ScrollArea` with `max-h-[55vh]` should work, but the dialog's flex layout and `overflow-hidden` may be clipping it.

**Fix:**
- Change the `DialogContent` from `overflow-hidden` to `overflow-y-auto` as a fallback
- Ensure the list view `ScrollArea` has a proper height constraint that works within the flex layout
- Add `overflow-hidden` to the flex-1 container in the detail view to ensure `ScrollArea` works for the recipients list

---

### 2. Personnel View Toggle Redesign

**Files:**
- `src/components/FreelancerFilters.tsx` -- rename and add "Include Employees" toggle
- `src/pages/AdminDashboard.tsx` -- add `includeEmployees` state (default `true`), wire into filter logic
- `src/components/AddProjectDialog.tsx` -- same changes for the project dialog's personnel list

**Current behavior:**
- Section labeled "Freelancers:" with two toggles: "Include freelancers" (off) and "Show freelancers only" (off)
- Employees are always shown by default

**New behavior:**
- Section labeled "Personnel view" (with Users icon instead of Briefcase)
- Three toggles in order:
  1. **Include Employees** -- default ON. When OFF, employees are hidden from the list
  2. **Include freelancers** -- default OFF (unchanged)
  3. **Show freelancers only** -- default OFF (unchanged)
- Interaction logic:
  - "Show freelancers only" ON automatically enables "Include freelancers" and disables "Include Employees"
  - "Include Employees" ON while "Show freelancers only" is ON will turn off "Show freelancers only"
  - At least one of "Include Employees" or "Include freelancers" must be on (prevent empty state)

**Filter logic change in AdminDashboard (and AddProjectDialog):**
- Add: `if (!includeEmployees && p.category === 'employee') return false;`
- This is added alongside the existing freelancer filter checks

**Props change for FreelancerFilters:**
- Add `includeEmployees: boolean` and `onIncludeEmployeesChange: (value: boolean) => void`
- Component renamed conceptually but file kept as-is to minimize churn

---

### Files Changed

| File | Action | Description |
|------|--------|-------------|
| `src/components/NotificationsLog.tsx` | MODIFY | Fix scroll by adjusting overflow strategy on DialogContent |
| `src/components/FreelancerFilters.tsx` | MODIFY | Add "Include Employees" toggle, rename label to "Personnel view", reorder toggles |
| `src/pages/AdminDashboard.tsx` | MODIFY | Add `includeEmployees` state, wire into filter logic and FreelancerFilters props |
| `src/components/AddProjectDialog.tsx` | MODIFY | Same `includeEmployees` state and filter logic for project personnel list |

