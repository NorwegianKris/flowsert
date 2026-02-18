

## Step 3 -- Remove Accidental UPDATE/DELETE on project_messages

### Problem

The `project_messages` table has a `FOR ALL` baseline policy (`"Require authentication for project_messages"`) with `USING (auth.uid() IS NOT NULL)`. This inadvertently grants UPDATE and DELETE to any authenticated user, violating the immutability rule.

### Solution

Drop the `FOR ALL` policy. The existing explicit SELECT and INSERT policies already enforce authentication internally, so no replacement is needed.

### Migration SQL

```sql
DROP POLICY IF EXISTS "Require authentication for project_messages"
  ON public.project_messages;
```

### What remains

| Operation | Policy | Who |
|-----------|--------|-----|
| SELECT | "Admins can view project messages" | Admins (business_id match) |
| SELECT | "Workers can view project messages" | Workers (invited or assigned) |
| INSERT | "Admins can send project messages" | Admins (sender_id = self, business match) |
| INSERT | "Assigned workers can send project messages" | Workers (sender_id = self, assigned only) |
| UPDATE | (none) | Denied for everyone |
| DELETE | (none) | Denied for everyone |

### Technical Details

- Single database migration, no code changes
- Zero risk: authentication checks are embedded in each remaining policy
- This is a DB-only hardening change

