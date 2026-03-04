

## Standardize Employee/Freelancer Badges Across the App

Purely cosmetic. No schema or backend changes. 🟢

### Reference Style (from PersonnelCard.tsx — the Personnel tab)
```tsx
<Badge variant={category === 'freelancer' ? 'secondary' : 'default'} className="font-normal">
  {category === 'freelancer' ? 'Freelancer' : 'Employee'}
</Badge>
```

### Files to Update

1. **`src/components/ProjectDetail.tsx`** (line 414)
   - Currently: `variant="secondary"` for all, custom lavender classes for freelancer
   - Fix: Use reference pattern with correct variant switching

2. **`src/components/WorkerProjectDetail.tsx`** (line 275)
   - Same issue as ProjectDetail — fix identically

3. **`src/components/project-timeline/PersonnelGroup.tsx`** (line 55–58)
   - Currently: Correct variants but `text-[8px] uppercase` sizing
   - Fix: Use `font-normal` class, remove uppercase, keep small sizing appropriate for timeline context (`text-[10px]`)

4. **`src/components/ActivationOverview.tsx`** (line 311)
   - Currently: `variant="outline"` for both
   - Fix: Use correct variant switching + `font-normal`

5. **`src/components/AddProjectDialog.tsx`** (lines 464–479, 1234–1239)
   - Currently: Custom `bg-violet-100 text-violet-700` for freelancer, complex logic
   - Fix: Simplify `getCategoryLabel` to return correct variant, use `font-normal`

6. **`src/components/PersonnelPreviewSheet.tsx`** (line 217–221)
   - Currently: Correct variants but missing `font-normal`
   - Fix: Add `className="font-normal"`

7. **`src/components/WorkerGroupsManageList.tsx`** (line 203)
   - Currently: Correct variants but `text-xs`
   - Fix: Change to `font-normal`

8. **`src/components/DataAcknowledgementsManager.tsx`** (line 157)
   - Currently: Correct variants but `text-xs`
   - Fix: Change to `font-normal`

9. **`src/components/SendNotificationDialog.tsx`** (line 364)
   - Currently: Only shows for freelancers, `text-xs`
   - Fix: Show for all, use reference pattern

10. **`src/components/RecentRegistrations.tsx`** (line 148)
    - Currently: Correct variants, `font-normal text-xs`
    - Fix: Remove `text-xs` to match reference exactly

