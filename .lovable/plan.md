

## Plan: Add Skills Tab to Custom Personnel Filter

### Overview
Add a 4th "Skills" tab to `CustomPersonnelFilterDialog` with searchable categorized skill checkboxes. Wire skills filter state through `FreelancerFilters` → `AdminDashboard` → `ExpiryTimeline` / `CompliancePlanGenerator`. OR matching: personnel pass if they match by ID, role, group, **or** any selected skill.

### Changes

**1. `src/components/CustomPersonnelFilterDialog.tsx`**
- Add `selectedSkills: string[]` prop and extend `onApply` to 4 params: `(ids, roles, groupIds, skills)`
- Add `localSkills` state, `Wrench` icon import, import `SKILL_CATEGORIES` from `@/lib/skillsData`
- Widen `activeTab` type to include `'skills'`
- Change `TabsList` from `grid-cols-3` → `grid-cols-4`, add Skills tab with badge count
- Add Skills tab content: search input + scrollable list of categories with emoji headers, each skill as a checkbox row (same pattern as Roles/Groups tabs)
- Include `localSkills` in `totalSelected`, `handleClear`, and `handleOpenChange` reset
- `handleApply` passes `localSkills` as 4th argument

**2. `src/components/FreelancerFilters.tsx`**
- Add `customSkills?: string[]` prop (default `[]`)
- Extend `onCustomFilterChange` signature to `(ids, roles, groupIds, skills)`
- Add `customSkills.length` to `customSelectionCount`
- Pass `selectedSkills={customSkills}` to `CustomPersonnelFilterDialog`
- Update `handleApplyCustomFilter` to accept and forward 4th `skills` param; include skills emptiness in the "reset to employees" guard

**3. `src/pages/AdminDashboard.tsx`**
- Add two new state arrays: `personnelCustomSkills` (personnel tab) and `customFilterSkills` (overview tab)
- Wire them as `customSkills` prop to both `FreelancerFilters` instances
- Update both `onCustomFilterChange` callbacks to accept and set the 4th skills param
- Extend `applyCategoryFilter` with a 5th param `customSkills: string[]`:
  ```
  const inBySkill = customSkills.length > 0 &&
    (p.skills || []).some(s => customSkills.includes(s));
  if (!inById && !inByRole && !inByGroup && !inBySkill) return false;
  ```
- Pass `customSkills` to `filteredPersonnel` and `overviewFiltered` useMemo calls
- Pass `customSkills` prop to `ExpiryTimeline` and `CompliancePlanGenerator`

**4. `src/components/ExpiryTimeline.tsx`**
- Add `customSkills?: string[]` prop (default `[]`)
- Add OR-match in the custom filter block: `(p.skills || []).some(s => customSkills.includes(s))`

**5. `src/components/CompliancePlanGenerator.tsx`**
- Same change as ExpiryTimeline: add `customSkills` prop and OR-match

### Files Changed
1. `src/components/CustomPersonnelFilterDialog.tsx`
2. `src/components/FreelancerFilters.tsx`
3. `src/pages/AdminDashboard.tsx`
4. `src/components/ExpiryTimeline.tsx`
5. `src/components/CompliancePlanGenerator.tsx`

