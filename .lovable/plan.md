

# Rename "Job Seeker" to "Freelancer" in Database Layer

## Overview

Rename all database objects that use "job_seeker" terminology to "freelancer" for consistency with the application's terminology. This is a cosmetic/naming change -- no logic changes needed since the UI already uses `category === 'freelancer'`.

## Risk Assessment

**Low risk** -- these are renames with no logic changes. But requires careful sequencing because the frontend calls these RPCs and table names directly.

## Database Changes (Single Migration)

### 1. Rename Table

```sql
ALTER TABLE job_seeker_invitations RENAME TO freelancer_invitations;
```

### 2. Rename Column

```sql
ALTER TABLE personnel RENAME COLUMN is_job_seeker TO is_freelancer;
```

### 3. Replace Database Functions

Drop and recreate with new names (keeping old signatures as thin wrappers temporarily if needed):

| Old Name | New Name |
|----------|----------|
| `get_job_seeker_invitation_by_token(lookup_token)` | `get_freelancer_invitation_by_token(lookup_token)` |
| `get_job_seeker_registration_by_code(lookup_code)` | `get_freelancer_registration_by_code(lookup_code)` |
| `get_worker_categories_for_job_seeker_token(lookup_token)` | `get_worker_categories_for_freelancer_token(lookup_token)` |
| `is_job_seeker_personnel(_personnel_id)` | `is_freelancer_personnel(_personnel_id)` |

### 4. Update `handle_new_user()` Trigger

- Change `is_job_seeker` column references to `is_freelancer`
- The metadata key `job_seeker_token` stays as-is in auth metadata (it's an internal key, not user-facing, and changing it would break existing pending signups)

### 5. Update `is_personnel_activated()` Function

- References `is_job_seeker` column -- update to `is_freelancer`

### 6. Update `can_access_personnel()` and Related

- Check if any function body references the old column name

## Frontend Changes (After Migration Deploys)

### `src/types/index.ts`
- Rename `isJobSeeker` to `isFreelancer` in the `Personnel` interface

### `src/hooks/usePersonnel.ts`
- Update column reference from `is_job_seeker` to `is_freelancer` in the select/mapping (2 places)
- Map to `isFreelancer` instead of `isJobSeeker`

### `src/hooks/useFreelancerInvitations.ts`
- Change `.from('job_seeker_invitations')` to `.from('freelancer_invitations')` (4 places)

### `src/pages/Auth.tsx`
- Update RPC calls:
  - `get_job_seeker_invitation_by_token` to `get_freelancer_invitation_by_token`
  - `get_worker_categories_for_job_seeker_token` to `get_worker_categories_for_freelancer_token`
- Keep the URL parameter `job_seeker_token` as-is (internal, not user-facing)

### `src/pages/FreelancerRedirect.tsx`
- Update RPC call from `get_job_seeker_registration_by_code` to `get_freelancer_registration_by_code`

### `src/components/AdminOverview.tsx`
- Change `is_job_seeker: false` to `is_freelancer: false` in the personnel insert

### `src/contexts/AuthContext.tsx`
- The metadata key `job_seeker_token` stays unchanged (internal auth metadata)

## What NOT to Change

- **Auth metadata keys** (`job_seeker_token`, `job_seeker_role`): These are embedded in the `handle_new_user` trigger and in-flight signups. Renaming would break anyone mid-registration. Leave as internal implementation detail.
- **`types.ts`**: Auto-generated, updates automatically after migration.
- **URL parameter** `job_seeker_token`: Internal routing parameter, not user-facing.

## Sequencing

1. Run migration (rename table, column, recreate functions, update trigger)
2. Wait for auto-generated types to refresh
3. Update all frontend references in one batch
4. Test freelancer registration flow end-to-end

## Technical Details

The migration must recreate (not just rename) the database functions because PostgreSQL does not support `ALTER FUNCTION ... RENAME`. Each function body that references the old table/column names must also be updated internally.
