
# Plan: Consolidate Worker Employment Types (Job Seeker to Freelancer)

## Overview

This change will simplify the worker employment types from three categories to two:
- **Employee** (was "Fixed Employee")
- **Freelancer** (will also include former "Job Seekers")

All existing job seeker profiles will be converted to freelancers, and all UI text throughout the system will be updated accordingly.

## Scope of Changes

### Database Changes

**Migration SQL:**
```sql
-- Convert all job seekers to freelancers
UPDATE personnel 
SET 
  is_job_seeker = false,
  category = 'freelancer'
WHERE is_job_seeker = true;

-- Update any fixed_employee references to 'employee'
UPDATE personnel 
SET category = 'employee'
WHERE category = 'fixed_employee';
```

### Type Definition Changes

**File: `src/types/index.ts`**
- Change `PersonnelCategory` from `'fixed_employee' | 'freelancer' | 'job_seeker'` to `'employee' | 'freelancer'`
- Remove `isJobSeeker` field from the `Personnel` interface (or deprecate it)

### Component Renaming

The following components will be renamed and repurposed:

| Old Name | New Name | Purpose |
|----------|----------|---------|
| `JobSeekerFilters.tsx` | `FreelancerFilters.tsx` | Toggle to include/show only freelancers |
| `JobSeekerInvitationsManager.tsx` | `FreelancerInvitationsManager.tsx` | Manage freelancer registration links |
| `JobSeekerRedirect.tsx` | `FreelancerRedirect.tsx` | Handle freelancer registration redirect |

### UI Text Changes

The following text replacements will be made across all files:

| Old Text | New Text |
|----------|----------|
| "Job Seeker" | "Freelancer" |
| "Job Seekers" | "Freelancers" |
| "job seeker" | "freelancer" |
| "job seekers" | "freelancers" |
| "Fixed Employee" | "Employee" |
| "Fixed Employees" | "Employees" |
| "fixed_employee" | "employee" |

### Files to Modify

#### Core Type Files
1. **`src/types/index.ts`**
   - Update `PersonnelCategory` type
   - Remove/deprecate `isJobSeeker` from `Personnel` interface

#### Filter Components
2. **`src/components/JobSeekerFilters.tsx`** -> Rename to `FreelancerFilters.tsx`
   - Update props interface names
   - Change all "Job Seeker" text to "Freelancer"
   
3. **`src/pages/AdminDashboard.tsx`**
   - Update import from `JobSeekerFilters` to `FreelancerFilters`
   - Update filter variable names (`includeJobSeekers` -> `includeFreelancers`, etc.)
   - Update filter logic to use category instead of isJobSeeker flag

#### Registration/Invitation Components
4. **`src/components/JobSeekerInvitationsManager.tsx`** -> Rename to `FreelancerInvitationsManager.tsx`
   - Update all UI text references
   - Update URL paths (keep backward compatible if needed)

5. **`src/pages/JobSeekerRedirect.tsx`** -> Rename to `FreelancerRedirect.tsx`
   - Update component name

6. **`src/components/RegistrationLinkCard.tsx`**
   - Change "Job Seeker Registration Link" to "Freelancer Registration Link"

7. **`src/App.tsx`**
   - Update import and route path for FreelancerRedirect

#### Personnel Display Components
8. **`src/components/PersonnelCard.tsx`**
   - Change "Job Seeker" badge to "Freelancer"
   - Change "Fixed Employee" to "Employee"
   - Update logic to check category instead of isJobSeeker

9. **`src/components/PersonnelPreviewSheet.tsx`**
   - Change "Fixed Employee" to "Employee"

10. **`src/components/PersonnelDetail.tsx`**
    - Remove job seeker-specific sections or adapt for freelancers
    - Update activation logic references

11. **`src/components/PersonnelFilters.tsx`**
    - Change employment type labels from "Fixed Employee" to "Employee"

#### Dashboard Stats
12. **`src/components/DashboardStats.tsx`**
    - Change count logic from `isJobSeeker` to category-based
    - Update label from "Job Seekers" to "Freelancers"

#### Dialog Components
13. **`src/components/ActivateProfileDialog.tsx`**
    - Change "Fixed Employee" option to "Employee"
    - Update category values

14. **`src/components/EditPersonnelDialog.tsx`**
    - Change "Fixed Employee" to "Employee"
    - Update category dropdown values

15. **`src/components/AddProjectDialog.tsx`**
    - Change job seeker references to freelancer
    - Update filter toggle text

16. **`src/components/SendNotificationDialog.tsx`**
    - Change recipient group labels and logic

17. **`src/components/ExternalSharingDialog.tsx`**
    - Change recipient group labels

#### Auth & Worker Dashboard
18. **`src/pages/Auth.tsx`**
    - Change "Job Seeker Registration" to "Freelancer Registration"
    - Update all job seeker token references to freelancer

19. **`src/pages/WorkerDashboard.tsx`**
    - Update job seeker references to freelancer

20. **`src/components/WelcomeDialog.tsx`**
    - Update messaging for freelancers

21. **`src/components/ProfileCompletionIndicator.tsx`**
    - Update completion messaging

#### Hooks
22. **`src/hooks/useJobSeekerInvitations.ts`** -> Rename to `useFreelancerInvitations.ts`
    - Update hook name and references

23. **`src/hooks/useSuggestPersonnel.ts`**
    - Update employment type logic and labels

24. **`src/hooks/usePersonnel.ts`**
    - Update mapping logic for isJobSeeker/category

25. **`src/contexts/AuthContext.tsx`**
    - Update parameter names from jobSeeker to freelancer

#### Edge Functions
26. **`supabase/functions/suggest-project-personnel/index.ts`**
    - Update employment type references

### Route Changes

The URL path `/register/jobseeker/:companyCode` will change to `/register/freelancer/:companyCode`.

Note: Consider keeping a redirect from the old path for backward compatibility with existing QR codes and shared links.

### Database RPC Functions

The following RPC functions reference job_seeker and may need updates:
- `get_job_seeker_invitation_by_token`
- `get_job_seeker_registration_by_code`
- `get_worker_categories_for_job_seeker_token`

These are database functions that will need to be renamed or aliased.

## Implementation Order

1. **Database Migration**: Convert all job seekers to freelancers and update categories
2. **Type Definitions**: Update TypeScript types
3. **Hooks**: Rename and update hooks
4. **Components**: Update all component files with new terminology
5. **Routes**: Update App.tsx routing
6. **Edge Functions**: Update AI suggestion function
7. **Database Functions**: Create new RPC functions or update existing ones

## Backward Compatibility Considerations

- Keep old route `/register/jobseeker/:companyCode` as a redirect to the new route
- The `job_seeker_invitations` table can remain named as-is (internal detail) but UI should say "Freelancer"
- Old RPC functions can be aliased to new names

## Summary Table

| Category | Files Affected |
|----------|---------------|
| Type definitions | 1 |
| Filter components | 2 |
| Registration components | 3 |
| Personnel display | 4 |
| Dashboard/Stats | 1 |
| Dialog components | 6 |
| Auth/Worker pages | 3 |
| Hooks | 4 |
| Edge functions | 1 |
| Routing | 1 |
| **Total** | **~26 files** |
