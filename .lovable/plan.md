

## Step 9 -- Business-Scoped Audit Logs (Corrected)

### What changed from the previous plan

The `FOR ALL TO authenticated` baseline policy has been **removed entirely**. It would have allowed authenticated clients to INSERT, UPDATE, and DELETE audit rows -- defeating the append-only, server-written design. Only two SELECT policies will exist.

### Step 9.1 -- Migration: Create `audit_logs` with SELECT-only RLS

```sql
-- 1) Append-only audit log table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  actor_user_id uuid,
  actor_role text,
  action_type text NOT NULL,
  entity_type text,
  entity_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2) Prevent empty action types
ALTER TABLE public.audit_logs
  ADD CONSTRAINT audit_logs_action_type_not_empty
  CHECK (length(trim(action_type)) > 0);

-- 3) Performance indexes
CREATE INDEX IF NOT EXISTS audit_logs_business_id_created_at_idx
  ON public.audit_logs (business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_actor_user_id_created_at_idx
  ON public.audit_logs (actor_user_id, created_at DESC);

-- 4) Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 5) NO baseline FOR ALL policy (intentional)

-- 6) Admin reads own business only
CREATE POLICY "Admins can read audit logs for their business"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin')
    AND business_id = get_user_business_id(auth.uid())
  );

-- 7) Superadmin reads all
CREATE POLICY "Superadmins can read all audit logs"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (is_superadmin(auth.uid()));
```

**Result:** No INSERT/UPDATE/DELETE policies exist. Only the service role (used by edge functions) can write. Authenticated clients get SELECT-only, scoped by business or superadmin.

---

### Step 9.2 -- Add audit logging to `delete-user` edge function

The `serviceClient` (service role) writes audit rows. Logging happens at two points:

**On successful deletion (after auth user removed):**
- `action_type`: `user.delete`
- `entity_type`: `user`
- `entity_id`: target user ID
- `metadata`: `{ target_email, result: "success" }`

**On authorization denial (before returning 403):**
- `action_type`: `user.delete.denied`
- `entity_type`: `user`
- `entity_id`: target user ID (if known)
- `metadata`: `{ reason: "not_superadmin" | "role_missing" | "self_delete_attempt" | "target_is_superadmin" }`

Denial logging happens at each 403/400 exit point. No sensitive payloads (request bodies, tokens) are logged.

The `business_id` for the log entry comes from the caller's profile (`get_user_business_id` equivalent via serviceClient query on profiles).

---

### Step 9.3 -- Verification

After migration and edge function deploy:

1. **Worker cannot read:** `SELECT count(*) FROM audit_logs` returns 0 rows
2. **Admin reads own business only:** `SELECT * FROM audit_logs LIMIT 10` returns only rows matching their business_id
3. **Client INSERT denied:** `INSERT INTO audit_logs (business_id, action_type) VALUES (...)` fails (no INSERT policy)
4. **Service role writes work:** Trigger delete-user (or manually insert via admin query tool) to confirm a row appears with correct business_id and action_type

---

### Step 9.4 -- Update plan.md

Append to Security Baseline:
- `audit_logs`: append-only, RLS enabled, SELECT-only policies
- No INSERT/UPDATE/DELETE policies (service role writes only)
- Admin scoped by `business_id = get_user_business_id()`
- Superadmin reads all via `is_superadmin()`
- `action_type` constraint prevents empty values

---

### Files Changed

- New migration SQL (table + indexes + constraint + RLS + 2 SELECT policies)
- `supabase/functions/delete-user/index.ts` -- audit log writes on success and denial
- `.lovable/plan.md` -- audit_logs section appended

### Rollback

```sql
DROP TABLE IF EXISTS public.audit_logs CASCADE;
```

### Risk

Minimal. Purely additive. No existing functionality affected. The only write path is service role from edge functions.
