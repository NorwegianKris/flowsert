

## Three Minor Fixes

**Risk: 🟢 GREEN** (Fix 1 and Fix 2) / **🟡 AMBER** (Fix 3 -- touches certificate input with OpenStreetMap API, anchor recommended before publish)

---

### Fix 1: Scroll to top when clicking an assigned project in personnel profile

**Problem:** When a worker clicks a project in their `AssignedProjects` list, `PersonnelDetail` swaps its render to `WorkerProjectDetail`, but the scroll position stays wherever the user was.

**Solution:** Add `window.scrollTo(0, 0)` in the `handleProjectClick` handler in `PersonnelDetail.tsx`.

**File:** `src/components/PersonnelDetail.tsx`

```typescript
const handleProjectClick = (project: Project) => {
  setSelectedProject(project);
  window.scrollTo({ top: 0, behavior: 'smooth' });
};
```

---

### Fix 2: Match Overview toggle (All/Employees/Freelancers/Custom) to the purple primary color

**Problem:** The `ToggleGroup` in `ComplianceSnapshot.tsx` uses default `data-[state=on]:bg-background` styling (white/gray), while the main `FreelancerFilters` bar uses the primary purple. The user wants them visually consistent.

**Solution:** Update the active state styling on each `ToggleGroupItem` to use `data-[state=on]:bg-primary data-[state=on]:text-primary-foreground` so the selected toggle pill is purple.

**File:** `src/components/ComplianceSnapshot.tsx` (lines 159-199)

Change the className on each `ToggleGroupItem` from:
```
data-[state=on]:bg-background data-[state=on]:shadow-sm
```
to:
```
data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:shadow-sm
```

This applies to all four items: All, Employees, Freelancers, Custom.

---

### Fix 3: Add OpenStreetMap location search to "Place of Issue" fields

**Problem:** The "Place of Issue" field for certificates is a plain text input, while all other location fields use the `GeoLocationInput` component with Photon/OpenStreetMap suggestions.

**Solution:** Replace the plain `<Input>` with `<GeoLocationInput>` in two files:

1. **`src/components/AddCertificateDialog.tsx`** (line 642-646) -- the smart upload / add certificate form
2. **`src/components/EditCertificateDialog.tsx`** (line 542-547) -- the edit certificate form

Both will import `GeoLocationInput` and swap the `<Input>` for `<GeoLocationInput>` with appropriate `value`/`onChange` props and a placeholder like `"e.g., Norway"`.

---

### Files Changed

| File | Action | Description |
|------|--------|-------------|
| `src/components/PersonnelDetail.tsx` | MODIFY | Add `window.scrollTo` on project click |
| `src/components/ComplianceSnapshot.tsx` | MODIFY | Purple active state on toggle group items |
| `src/components/AddCertificateDialog.tsx` | MODIFY | Replace Input with GeoLocationInput for Place of Issue |
| `src/components/EditCertificateDialog.tsx` | MODIFY | Replace Input with GeoLocationInput for Place of Issue |

