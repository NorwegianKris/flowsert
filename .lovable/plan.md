

## Step 10 -- Monitoring, Backups, and Restore Verification (Updated)

This incorporates the three tweaks you requested before implementation begins.

### What changed from the previous plan

1. **NULL business_id visibility documented** -- No policy change needed. The existing superadmin SELECT policy (`is_superadmin(auth.uid())`) already covers NULL-scoped rows. Admins cannot see them because `business_id = get_user_business_id(auth.uid())` never matches NULL. This will be explicitly documented in plan.md.

2. **No line numbers in docs** -- All references to edge function instrumentation points will use descriptive labels ("rate limit block", "gateway response handling", "response parse block") instead of line numbers.

3. **Retention cleanup note added** -- plan.md will include a deferred cleanup query for error_events (30-day retention, to be automated later). Same pattern noted for audit_logs.

---

### Step 10.1 -- Migration: Create `error_events` table

```sql
CREATE TABLE IF NOT EXISTS public.error_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid,
  actor_user_id uuid,
  source text NOT NULL,
  event_type text NOT NULL,
  severity text NOT NULL DEFAULT 'error',
  message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Constraints
ALTER TABLE public.error_events
  ADD CONSTRAINT error_events_event_type_not_empty
  CHECK (length(trim(event_type)) > 0);

ALTER TABLE public.error_events
  ADD CONSTRAINT error_events_severity_check
  CHECK (severity IN ('info', 'warn', 'error'));

ALTER TABLE public.error_events
  ADD CONSTRAINT error_events_source_check
  CHECK (source IN ('edge', 'client', 'db'));

-- Indexes
CREATE INDEX IF NOT EXISTS error_events_business_id_created_at_idx
  ON public.error_events (business_id, created_at DESC);

CREATE INDEX IF NOT EXISTS error_events_created_at_idx
  ON public.error_events (created_at DESC);

-- RLS: SELECT-only
ALTER TABLE public.error_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read error events for their business"
  ON public.error_events FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    AND business_id = get_user_business_id(auth.uid())
  );

CREATE POLICY "Superadmins can read all error events"
  ON public.error_events FOR SELECT TO authenticated
  USING (is_superadmin(auth.uid()));
```

Policies are intentionally identical to audit_logs. NULL business_id rows are superadmin-only by design.

---

### Step 10.2 -- Add `writeErrorEvent` to 4 edge functions

Fire-and-forget helper, wrapped in try/catch, never throws. Uses the existing `serviceClient` (service role).

**Functions and events (no line numbers -- descriptive locations only):**

#### certificate-chat/index.ts
| event_type | severity | Location |
|---|---|---|
| `chat.rate_limit` | warn | Rate limit block |
| `chat.ai_gateway_error` | error | Gateway response handling |

#### extract-certificate-data/index.ts
| event_type | severity | Location |
|---|---|---|
| `extract.rate_limit` | warn | Rate limit block |
| `extract.ai_gateway_error` | error | Gateway response handling |
| `extract.parse_error` | error | Response parse block |

#### suggest-project-personnel/index.ts
| event_type | severity | Location |
|---|---|---|
| `suggest.rate_limit` | warn | Rate limit block |
| `suggest.ai_gateway_error` | error | Gateway response handling |

#### delete-user/index.ts
| event_type | severity | Location |
|---|---|---|
| `delete_user.personnel_unlink_fail` | error | Personnel unlink step |
| `delete_user.roles_delete_fail` | error | Roles deletion step |
| `delete_user.auth_delete_fail` | error | Auth user deletion step |

**Never logged:** request bodies, tokens, base64 images, prompts, document content.

---

### Step 10.3 -- Update plan.md

Append to Security Baseline:

- `error_events`: append-only, RLS enabled, SELECT-only policies
- Constraints: `severity IN ('info','warn','error')`, `source IN ('edge','client','db')`
- Admin sees own business only; superadmin sees all including NULL business_id rows
- **NULL business_id events are visible only to superadmin** (admins cannot match NULL)
- Linter "no INSERT/UPDATE/DELETE policy" warnings are intentional
- Event types table (as above, no line numbers)
- **Retention cleanup (deferred):**
  - `DELETE FROM public.error_events WHERE created_at < now() - interval '30 days';`
  - `DELETE FROM public.audit_logs WHERE created_at < now() - interval '90 days';`
  - To be automated via scheduled function later
- Backup section: "Backup method and retention to be verified in Lovable Cloud admin. Record retention period and last successful backup date here once confirmed."

---

### Step 10.4 -- Verification

1. Worker sees 0 rows from error_events
2. Admin sees only their business_id rows (not NULL rows)
3. Superadmin sees all rows including NULL business_id
4. Client INSERT denied (no INSERT policy)
5. Invalid severity rejected (e.g. `'warning'`)
6. Invalid source rejected (e.g. `'api'`)
7. Service role write works (insert test row, verify, delete)

---

### Files changed

- New migration SQL
- `supabase/functions/certificate-chat/index.ts`
- `supabase/functions/extract-certificate-data/index.ts`
- `supabase/functions/suggest-project-personnel/index.ts`
- `supabase/functions/delete-user/index.ts`
- `.lovable/plan.md`

### Rollback

```sql
DROP TABLE IF EXISTS public.error_events CASCADE;
```

Remove `writeErrorEvent` calls from edge functions.

### Risk

Minimal. Purely additive. Fire-and-forget logging never affects main request flow.
