

## Fix: Personnel View Toggle Responsiveness

**Risk: 🟢 GREEN** — Pure UI logic change. No database, RLS, edge functions, authentication, or access control affected.

---

### Problem

The toggles appear "slow" or unresponsive because the empty-state guards silently swallow clicks. With the default state (Employees ON, Freelancers OFF), clicking "Include Employees" OFF does nothing -- the guard at line 24 (`if (!checked && !includeFreelancers) return;`) blocks the action with zero feedback.

### Solution

Replace the silent `return` guards with auto-enable logic. When a user disables one toggle while the other is already off, automatically enable the other toggle first, then process the change.

**File:** `src/components/FreelancerFilters.tsx`

**Change the two handler functions:**

```typescript
// BEFORE (silent block)
const handleIncludeEmployeesChange = (checked: boolean) => {
  if (!checked && !includeFreelancers) return; // user sees nothing happen
  ...
};

// AFTER (auto-enable companion)
const handleIncludeEmployeesChange = (checked: boolean) => {
  if (!checked && !includeFreelancers) {
    onIncludeFreelancersChange(true); // auto-enable the other
  }
  onIncludeEmployeesChange(checked);
  if (checked && showFreelancersOnly) {
    onShowFreelancersOnlyChange(false);
  }
};
```

Same pattern applied to `handleIncludeFreelancersChange`.

---

### Files Changed

| File | Action | Description |
|------|--------|-------------|
| `src/components/FreelancerFilters.tsx` | MODIFY | Replace silent guards with auto-enable companion toggle logic |

