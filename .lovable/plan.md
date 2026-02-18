
## Step 11 -- Release Gate and Regression Checklist

**Objective:** Ensure every deploy is safe, predictable, and reversible. Prevents RLS regressions, catches broken flows fast, enforces migration discipline, defines stop-ship criteria and rollback steps.

**Risk level:** Minimal (process + documentation). Biggest risk is _not following it_.

---

### 1. Preflight Checks (before every deploy)

#### 1.1 Confirm environment

- Verify project name / URL in Lovable Cloud
- Confirm branch/commit (if applicable)
- Confirm current migration head matches expected

#### 1.2 Database health quick check

```sql
select now();

select
  to_regclass('public.personnel')        is not null as has_personnel,
  to_regclass('public.direct_messages')   is not null as has_direct_messages,
  to_regclass('public.project_messages')  is not null as has_project_messages,
  to_regclass('public.audit_logs')        is not null as has_audit_logs,
  to_regclass('public.error_events')      is not null as has_error_events;
```

**Gate:** All five must return `true`.

#### 1.3 RLS policy audit — no `FOR ALL` on sensitive tables

```sql
select schemaname, tablename, policyname, permissive, roles, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('direct_messages','project_messages','feedback','audit_logs','error_events')
order by tablename, policyname;
```

**Gate:** No policy with `cmd = 'ALL'` on those tables.

#### 1.4 Anon execute grant check

```sql
select
  n.nspname as schema,
  p.proname as function,
  p.proacl
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('enforce_rate_limit','trg_limit_direct_messages');
```

**Gate:** No `anon=...X...` entries in `proacl`.

---

### 2. Deployment Rules (non-negotiable)

| Rule | Description |
|------|-------------|
| **A — Atomic migrations** | One migration = one change set. Use `IF EXISTS` / `IF NOT EXISTS`. |
| **B — Add before remove** | Policy changes: add new policy → verify → remove old. Never drop access first. |
| **C — Allowlisted revokes** | Never revoke `anon` broadly without verifying signup flows. |
| **D — Fire-and-forget logging** | All new server logging must be fire-and-forget. No logging call should break the primary request. |

---

### 3. Post-Deploy Regression Mini-Suite

Run these as real users in the app, plus DB checks where noted.

#### 3.1 Auth / onboarding smoke

- [ ] Login works
- [ ] Signup/invite registration works (if enabled)
- [ ] Password policy enforced (HIBP + min length)
- [ ] Password change requires reauth (if enabled)

#### 3.2 Worker isolation smoke

Using Worker A:

- [ ] "My Companies" shows only their companies
- [ ] Can open Admin Chat for their own personnel record
- [ ] **Cannot** query/see another worker's DMs (foreign personnel thread should fail/empty)

#### 3.3 Admin scoping smoke

Using Admin:

- [ ] Can view personnel list for their business
- [ ] Can view project chat for projects in their business
- [ ] **Cannot** view data from any other business (if a second tenant exists)

#### 3.4 Messaging

- [ ] Send DM: message appears once (no duplicates)
- [ ] Unread counts behave
- [ ] Rate limiting works: spam 31 messages quickly → friendly toast

#### 3.5 AI endpoints

- [ ] `certificate-chat` returns OK on a normal request
- [ ] Rate limit works: >10/min returns 429 and UI handles it
- [ ] `extract-certificate-data` returns OK (test doc)
- [ ] `suggest-project-personnel` returns OK (test request)

#### 3.6 Audit + error logging

- [ ] Perform one admin action that logs (delete-user in test env or certificate update)
- [ ] `audit_logs` row appears (admin can read own business)
- [ ] Trigger a controlled edge failure (or rate limit) → `error_events` row appears
- [ ] Workers **cannot** read `audit_logs` / `error_events`

---

### 4. Stop-Ship Criteria

Rollback immediately if **ANY** of these occur:

1. Login/signup broken
2. Worker sees other worker's DMs or feedback
3. Admin cannot access their own business data
4. AI endpoints failing across the board
5. Migrations partially applied / repeated failures
6. Any new permissive `FOR ALL` policy on sensitive tables

> **15-minute rule:** If any stop-ship condition is detected post-deploy and cannot be resolved within 15 minutes, initiate rollback immediately.

---

### 5. Go/No-Go Gate

> **Release is approved only if all mini-suite items pass and no stop-ship criteria are triggered. Otherwise rollback immediately and open a fix task.**

**Release approval requires explicit sign-off by:**

- The deployer
- One admin-level tester
- (If production) Superadmin

---

### 6. Known Intentional Warnings

| Table | Warning | Reason |
|-------|---------|--------|
| `rate_limits` | No RLS policies | Internal-only table, accessed by database functions only |
| `audit_logs` | No INSERT/UPDATE/DELETE policies | Service-role writes only; SELECT restricted to business admins |
| `error_events` | No INSERT/UPDATE/DELETE policies | Service-role writes only; SELECT restricted to business admins |

---

### 7. Rollback Protocol

#### 7.1 Code rollback

Revert to previous known-good version in Lovable (or last deployment).

#### 7.2 Database rollback

Prefer forward-fix migrations (safer than down migrations). Emergency options:

```sql
-- Emergency: disable DM limiter trigger if it causes issues
DROP TRIGGER IF EXISTS limit_direct_messages ON public.direct_messages;

-- Emergency: re-create a prior SELECT policy if a new one blocks access
CREATE POLICY "restore_admin_select_dm"
ON public.direct_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.personnel p
    WHERE p.user_id = auth.uid()
      AND p.business_id = (
        SELECT p2.business_id FROM public.personnel p2
        WHERE p2.id = direct_messages.personnel_id
      )
      AND p.role = 'admin'
  )
);

-- Emergency: re-grant execute for a specific function (allowlisted only)
GRANT EXECUTE ON FUNCTION public.enforce_rate_limit(text, integer, integer) TO anon;
```

---

### 8. Release Run Log Template

Copy/paste this for every deploy:

```
┌─────────────────────────────────────────────────┐
│              RELEASE RUN LOG                    │
├─────────────────────────────────────────────────┤
│ Date (UTC+1):                                   │
│ Environment (dev/stage/prod):                   │
│ Deployed commit/tag:                            │
│ DB migration head:                              │
│ Tester (admin user):                            │
│ Tester (worker user):                           │
├─────────────────────────────────────────────────┤
│ RESULTS                                         │
│                                                 │
│ Auth/login:              ☐ PASS  ☐ FAIL         │
│ Invite flow:             ☐ PASS  ☐ FAIL  ☐ N/A │
│ Password policy:         ☐ PASS  ☐ FAIL         │
│ Worker DM isolation:     ☐ PASS  ☐ FAIL         │
│ Admin scoping:           ☐ PASS  ☐ FAIL         │
│ DM rate limit:           ☐ PASS  ☐ FAIL         │
│ AI OK:                   ☐ PASS  ☐ FAIL         │
│ AI 429:                  ☐ PASS  ☐ FAIL         │
│ audit_logs:              ☐ PASS  ☐ FAIL         │
│ error_events:            ☐ PASS  ☐ FAIL         │
├─────────────────────────────────────────────────┤
│ Notes / incidents:                              │
│                                                 │
│ Rollback needed? (Y/N):                         │
│                                                 │
│ Sign-off:                                       │
│   Deployer:                                     │
│   Admin tester:                                 │
│   Superadmin (prod only):                       │
└─────────────────────────────────────────────────┘
```

---

### Baseline Run

_(Recorded 2026-02-18)_

```
Date (UTC+1):       2026-02-18
Environment:        dev
Preflight 1.2:      ✅ PASS — all five tables exist
Preflight 1.3:      ⚠️ FLAG — direct_messages has a FOR ALL policy
                    ("Require authentication for direct_messages", cmd=ALL, roles={public})
                    All other sensitive tables: no FOR ALL policies. PASS.
Preflight 1.4:      ✅ PASS — no anon grants on enforce_rate_limit or trg_limit_direct_messages
```

**Action item:** The `FOR ALL` policy on `direct_messages` should be reviewed. It may be redundant given the per-operation policies already in place. Consider dropping it in a future migration (add-before-remove rule applies).
