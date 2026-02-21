

## Fix: Personnel Toggle Independence

**Risk: 🟢 GREEN** — Pure UI logic, no backend changes.

---

### Current Problem

"Include Employees" auto-enables "Include Freelancers" when toggled off (and vice versa). The user wants simpler, more independent behavior.

### New Behavior

- **Include Employees**: default ON. Only affected by "Show freelancers only" (which turns it OFF). Otherwise fully independent — toggling "Include Freelancers" has no effect on it.
- **Include Freelancers**: default OFF. Independent of "Include Employees". Turned off if "Show freelancers only" is turned off.
- **Show freelancers only**: default OFF. Turning ON sets Employees=OFF and Freelancers=ON. Turning OFF just disables itself.

This means both "Include Employees" and "Include Freelancers" can be OFF simultaneously (showing no personnel). That's acceptable — the user wants independence.

### Change

**File:** `src/components/FreelancerFilters.tsx`

Replace the three handlers with:

```typescript
const handleIncludeEmployeesChange = (checked: boolean) => {
  onIncludeEmployeesChange(checked);
  if (checked && showFreelancersOnly) {
    onShowFreelancersOnlyChange(false);
  }
};

const handleIncludeFreelancersChange = (checked: boolean) => {
  onIncludeFreelancersChange(checked);
  if (!checked && showFreelancersOnly) {
    onShowFreelancersOnlyChange(false);
  }
};

const handleShowOnlyChange = (checked: boolean) => {
  onShowFreelancersOnlyChange(checked);
  if (checked) {
    if (!includeFreelancers) onIncludeFreelancersChange(true);
    if (includeEmployees) onIncludeEmployeesChange(false);
  }
};
```

No guard logic, no auto-enabling companions. Simple and direct.

---

### Files Changed

| File | Action | Description |
|------|--------|-------------|
| `src/components/FreelancerFilters.tsx` | MODIFY | Simplify handlers to make toggles independent |

