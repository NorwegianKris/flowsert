

## Activate All Profiles by Default

**Risk: YELLOW** -- touches database default and trigger logic (activation/billing implications).

---

### Current Behavior

| Registration Path | `activated` column set to | Functionally activated? |
|---|---|---|
| Admin adds employee manually | `false` (DB default) | Yes -- `is_personnel_activated()` returns `true` for non-freelancers regardless |
| Worker signs up via invitation | `false` (DB default) | Yes -- same bypass for non-freelancers |
| Freelancer self-registers | `true` (set in trigger) | Yes |
| Freelancer added by admin | `false` (DB default) | No -- requires manual activation |

So **the only case where a profile is NOT activated** is when an admin manually creates a freelancer. All other paths are already effectively activated.

### What Needs to Change

To make ALL profiles activated by default in every scenario:

**1. Change the database column default** (migration)

Change `ALTER TABLE personnel ALTER COLUMN activated SET DEFAULT true` so any new row is activated regardless of how it's created.

**2. Update `AddPersonnelDialog.tsx`**

The insert statement does not currently pass `activated`. With the new DB default of `true`, this is automatically handled -- no code change strictly required. However, for explicitness, we could add `activated: true` to the insert.

**3. Simplify `is_personnel_activated()` function** (optional cleanup)

Currently this function has special logic: "if not freelancer, always return true." With the new default, we could simplify it to just read the `activated` column directly, since all profiles will be `true` by default. This is optional but removes confusing special-case logic.

**4. Update `ActivateProfileDialog.tsx` UI behavior**

The activation/deactivation toggle for freelancers in `PersonnelDetail.tsx` should remain available so admins can still deactivate profiles if needed. No change required here -- it already works as a toggle.

### Summary

The system already activates all profiles by default except freelancers added manually by an admin. The fix is a single DB migration to change the column default from `false` to `true`, plus updating any existing `false` rows to `true`.

### Files Changed

1. **Database migration** -- `ALTER COLUMN activated SET DEFAULT true` + backfill existing rows
2. **`src/components/AddPersonnelDialog.tsx`** -- (optional) explicitly pass `activated: true` in the insert for clarity

