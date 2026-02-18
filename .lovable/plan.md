

## Security Baseline v1

### audit_logs (Step 9)

- **Table**: `public.audit_logs` — append-only, RLS enabled
- **Policies**: SELECT-only (no INSERT/UPDATE/DELETE policies)
  - Admin scoped by `business_id = get_user_business_id(auth.uid())`
  - Superadmin reads all via `is_superadmin(auth.uid())`
- **Write path**: Service role only (edge functions)
- **Constraint**: `action_type` must be non-empty (`audit_logs_action_type_not_empty`)
- **Indexes**: `(business_id, created_at DESC)`, `(actor_user_id, created_at DESC)`
- **Linter note**: "RLS Enabled No Policy" for INSERT/UPDATE/DELETE is intentional — append-only design

### Audit events logged

| action_type | entity_type | Source | When |
|---|---|---|---|
| `user.delete` | `user` | `delete-user` edge function | Successful user deletion |
| `user.delete.denied` | `user` | `delete-user` edge function | Authorization denial (role_missing, not_superadmin, self_delete_attempt, target_is_superadmin) |

### Rollback

```sql
DROP TABLE IF EXISTS public.audit_logs CASCADE;
```
