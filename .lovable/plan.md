

## Step 10 -- Monitoring, Backups, and Restore Verification

### Status: ✅ Implemented

### error_events table

- Append-only, RLS enabled, SELECT-only policies (no INSERT/UPDATE/DELETE -- service role writes only)
- Constraints: `severity IN ('info','warn','error')`, `source IN ('edge','client','db')`, `event_type` non-empty
- Indexes: `(business_id, created_at DESC)` and `(created_at DESC)`
- Admin sees own business only; superadmin sees all including NULL business_id rows
- **NULL business_id events are visible only to superadmin** (admins cannot match NULL via `get_user_business_id()`)
- Linter "no INSERT/UPDATE/DELETE policy" warnings are intentional

### Edge function error events

| Function | event_type | severity | Location |
|---|---|---|---|
| certificate-chat | `chat.rate_limit` | warn | Rate limit block |
| certificate-chat | `chat.ai_gateway_error` | error | Gateway response handling |
| extract-certificate-data | `extract.rate_limit` | warn | Rate limit block |
| extract-certificate-data | `extract.ai_gateway_error` | error | Gateway response handling |
| extract-certificate-data | `extract.parse_error` | error | Response parse block |
| suggest-project-personnel | `suggest.rate_limit` | warn | Rate limit block |
| suggest-project-personnel | `suggest.ai_gateway_error` | error | Gateway response handling |
| delete-user | `delete_user.personnel_unlink_fail` | error | Personnel unlink step |
| delete-user | `delete_user.roles_delete_fail` | error | Roles deletion step |
| delete-user | `delete_user.auth_delete_fail` | error | Auth user deletion step |

**Never logged:** request bodies, tokens, base64 images, prompts, document content.

All logging is fire-and-forget via `writeErrorEvent()` wrapped in try/catch. Failures to log never affect the main request flow.

### Retention cleanup (deferred)

To be automated via scheduled function later:

```sql
DELETE FROM public.error_events WHERE created_at < now() - interval '30 days';
DELETE FROM public.audit_logs WHERE created_at < now() - interval '90 days';
```

### Backup and restore

Backup method and retention to be verified in Lovable Cloud admin. Record retention period and last successful backup date here once confirmed.

### Rollback

```sql
DROP TABLE IF EXISTS public.error_events CASCADE;
```

Remove `writeErrorEvent` calls from edge functions.
