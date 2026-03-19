

## Plan: Add Skills Tab to Custom Personnel Filter

### Overview
Add a 4th "Skills" tab to the `CustomPersonnelFilterDialog`, using the same categorized skill list from `SkillsSelector`. Filter logic uses OR matching — personnel with ANY selected skill are shown.

### Changes

**1. `src/components/CustomPersonnelFilterDialog.tsx`**
- Add `selectedSkills: string[]` to props interface and `onApply` signature (add 4th param `skills: string[]`)
- Add `localSkills` state, `Wrench` icon import
- Change TabsList to `grid-cols-4`, add "Skills" tab with badge count
- Add Skills tab content: search input + categorized skill list (reuse the same 18-category constant from `SkillsSelector.tsx` or import it). Each skill shown as a checkbox row, grouped under emoji category headers. Search filters across all categories.
- Include `localSkills` in `totalSelected`, `handleClear`, and `handleOpenChange` reset
- `handleApply` passes `localSkills` as 4th argument

**2. `src/components/FreelancerFilters.tsx`**
- Add `customSkills?: string[]` prop (default `[]`)
- Update `onCustomFilterChange` signature to include 4th param `skills: string[]`
- Include `customSkills.length` in `customSelectionCount`
- Pass `selectedSkills={customSkills}` to dialog
- Update `handleApplyCustomFilter` to forward skills, and check skills emptiness in the "reset to employees" condition

**3. `src/pages/AdminDashboard.tsx`**
- Add `personnelCustomSkills` and `customFilterSkills` state arrays
- Wire them through `FreelancerFilters` props and `onCustomFilterChange` callbacks (both personnel tab and overview tab)
- Update `applyCategoryFilter` to accept `customSkills: string[]` as 5th param, add OR-match: `const inBySkill = customSkills.length > 0 && (p.skills || []).some(s => customSkills.includes(s))`
- Add `customSkills` to the filter condition: `if (!inById && !inByRole && !inByGroup && !inBySkill) return false`
- Pass `customSkills` to `ExpiryTimeline` and `CompliancePlanGenerator` if they accept it

**4. `src/components/ExpiryTimeline.tsx` and `src/components/CompliancePlanGenerator.tsx`**
- Add `customSkills?: string[]` prop
- Include skills OR-match in their personnel filtering logic, same pattern as above

### Skills Data
Import the categorized skills constant from `SkillsSelector.tsx` (export it as `SKILL_CATEGORIES`). In the Skills tab, render each category with its emoji header, skills as checkbox rows with search filtering — compact format matching the existing Individuals/Roles/Groups tabs.

### Filter Logic
OR matching: a person passes the custom filter if they match by ID, role, group, **or** skill. This is consistent with the existing OR logic across the other three dimensions.

### Files Changed
1. `src/components/CustomPersonnelFilterDialog.tsx`
2. `src/components/FreelancerFilters.tsx`
3. `src/pages/AdminDashboard.tsx`
4. `src/components/ExpiryTimeline.tsx`
5. `src/components/CompliancePlanGenerator.tsx`

