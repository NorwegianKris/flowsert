

## Updated Plan: Rotation Schedule + Back-to-Back Shifts

Incorporating the four feedback points into the previously approved plan.

---

### Feedback Integration

**1. RLS on project_events INSERT — documented bypass**

The `project_events` INSERT policy stays as `has_role(auth.uid(), 'admin')` for any future client-side usage. The migration will include a SQL comment documenting that the auto-close edge function uses the service role key and bypasses RLS entirely.

**2. Edge function secret check**

Add `INTERNAL_CRON_SECRET` to secrets via the `add_secret` tool. The edge function checks `x-internal-secret` header before processing. The cron job SQL includes this secret in headers.

```typescript
const secret = Deno.env.get('INTERNAL_CRON_SECRET');
const provided = req.headers.get('x-internal-secret');
if (!secret || provided !== secret) {
  return new Response('Unauthorized', { status: 401 });
}
```

Cron job header updated:
```sql
headers:='{"Content-Type":"application/json","x-internal-secret":"<secret_value>"}'::jsonb
```

Since the cron SQL contains the secret value, it will be inserted via the insert tool (not migration) to avoid leaking it in version-controlled migration files.

**3. Shift creation naming preview**

When `isBackToBack` is enabled in the form, show a preview below the project name field:

```text
Projects will be created as:
  Platform Alpha — Shift 1
  Platform Alpha — Shift 2
  Platform Alpha — Shift 3
```

The parent project name is NOT mutated after creation. Instead, all shift projects (including shift 1) are created with the suffix from the start. The preview makes this clear before submission.

**4. Unassigned shift warning in edge function**

Add to the auto-close edge function: query shift projects where `next_open_date` is within 7 days AND `assigned_personnel` is empty (`'{}'` or null). Send notification:

> "Shift [n] of [Project name] starts in [X] days and has no personnel assigned."

---

### Files Changed

| File | Change |
|------|--------|
| DB migration | 10 new columns on `projects` + `project_events` table (with documented RLS bypass comment) |
| Secret | `INTERNAL_CRON_SECRET` added via add_secret tool |
| `src/hooks/useProjects.ts` | New rotation/shift fields in interfaces + multi-insert for shifts |
| `src/components/AddProjectDialog.tsx` | Replace recurring UI with on/off/count/auto-close + back-to-back toggle with name preview |
| `src/components/EditProjectDialog.tsx` | Rotation fields + read-only shift info |
| `src/components/ProjectsTab.tsx` | Shift group cards + rotation status badges |
| `src/components/ProjectDetail.tsx` | Shift tabs + rotation timeline + compliance snapshots |
| `supabase/functions/auto-close-projects/index.ts` | New edge function with secret check + unassigned shift warning |
| Cron job (insert tool) | Schedule with secret header |

All other plan details (rotation form UI, grouped card view, compliance date scoping, edge function rotation logic) remain as previously specified.

