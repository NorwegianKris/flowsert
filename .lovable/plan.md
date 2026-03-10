

## Fix: Move Shift Tabs to Correct Location in Personnel Panel

### Problem

The shift tabs JSX (lines 134-159) is placed in the middle of hook/variable declarations — outside the component's `return` statement. It never renders.

### Fix

1. **Remove the misplaced tabs block** from lines 134-159 (between `useMemo` and AI suggestions state)

2. **Insert the tabs block inside the JSX return**, directly above the `FreelancerFilters` component at line 1174, so it sits above the All/Employees/Freelancers/Custom filter row

The tabs markup stays identical — just relocated to the correct position in the render tree.

### Files Changed

| File | Change |
|------|--------|
| `src/components/AddProjectDialog.tsx` | Remove misplaced tabs block from lines 134-159; insert same block at line 1173 (above `FreelancerFilters`) |

