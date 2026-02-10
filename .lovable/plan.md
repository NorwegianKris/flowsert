

# Fix: "Tell Me About Yourself" Section Missing for Freelancer Profiles

## Problem
The bio section ("Tell me about yourself") in `PersonnelDetail.tsx` and `EditPersonnelDialog.tsx` is gated by `personnel.isJobSeeker === true`. However, when an admin activates a freelancer profile via `ActivateProfileDialog`, it sets `is_job_seeker = false`. This means every activated freelancer permanently loses the bio section. Currently there are zero rows in the database with `is_job_seeker = true`, so no one sees the section.

## Root Cause
`is_job_seeker` serves double duty:
- Registration origin marker ("arrived via freelancer funnel")
- UI visibility flag ("show freelancer-specific sections like bio")

Activation clears the flag, which removes all freelancer-specific UI.

## Fix
Change the condition for showing freelancer-specific UI from `isJobSeeker` to `category === 'freelancer'`. This preserves the section after activation.

### File: `src/components/PersonnelDetail.tsx`

Replace all `personnel.isJobSeeker` checks that control UI visibility with `personnel.category === 'freelancer'` (or `personnel.category === 'freelancer' || personnel.isJobSeeker` for a safer transition). Specifically:

| Line Area | Current Condition | New Condition | What It Controls |
|-----------|-------------------|---------------|------------------|
| ~126 | `personnel.isJobSeeker` | `personnel.category === 'freelancer'` | Activate/Deactivate button |
| ~172 | `personnel.isJobSeeker && !isActivated` | `personnel.category === 'freelancer' && !isActivated` | Activation status banner |
| ~355 | `personnel.isJobSeeker` | `personnel.category === 'freelancer'` | "Tell me about yourself" card |
| ~428 | `personnel.isJobSeeker` | `personnel.category === 'freelancer'` | Encouraging message in certificates |
| ~439 | `!personnel.isJobSeeker \|\| isActivated` | `personnel.category !== 'freelancer' \|\| isActivated` | Profile activated check |
| ~448 | `!personnel.isJobSeeker` | `!personnel.category === 'freelancer'` ... actually `personnel.category !== 'freelancer'` | Hide projects for freelancers |
| ~517 | `!personnel.isJobSeeker` | `personnel.category !== 'freelancer'` | Hide Next of Kin for freelancers |

### File: `src/components/EditPersonnelDialog.tsx`

| Line Area | Current Condition | New Condition | What It Controls |
|-----------|-------------------|---------------|------------------|
| ~42 | `personnel.isJobSeeker === true` | `personnel.category === 'freelancer'` | `isJobSeeker` local variable |

This variable gates the bio textarea and the next-of-kin section. Renaming it to `isFreelancer` for clarity.

### File: `src/components/ActivateProfileDialog.tsx`

No change needed to the `is_job_seeker = false` logic on activation -- it can still clear the registration flag. The UI will no longer depend on that flag.

## Summary of Changes

| File | Change |
|------|--------|
| `src/components/PersonnelDetail.tsx` | Replace `isJobSeeker` UI checks with `category === 'freelancer'` |
| `src/components/EditPersonnelDialog.tsx` | Replace `isJobSeeker` check with `category === 'freelancer'` for bio/next-of-kin gating |

No database changes required.
