

## Step 11 -- Release Gate and Regression Checklist

**What:** Append a complete Step 11 section to `.lovable/plan.md`. No code, no migrations, no edge function changes.

### Content to append (eight subsections)

**1. Preflight Checks** -- Four items with inline SQL:
- Environment confirmation note
- Database health quick check (`to_regclass` for `personnel`, `direct_messages`, `project_messages`, `audit_logs`, `error_events`)
- RLS policy audit: no `FOR ALL` on sensitive tables
- Anon execute grant check for `enforce_rate_limit` and `trg_limit_direct_messages`

**2. Deployment Rules** -- Four non-negotiable rules (atomic migrations with `IF NOT EXISTS`, add-before-remove policies, allowlisted revokes, fire-and-forget logging)

**3. Post-Deploy Regression Mini-Suite** -- Six groups: Auth/onboarding, Worker isolation, Admin scoping, Messaging, AI endpoints, Audit + error logging

**4. Stop-Ship Criteria** -- Six conditions triggering immediate rollback, plus the 15-minute rule:
> "If any stop-ship condition is detected post-deploy and cannot be resolved within 15 minutes, initiate rollback immediately."

**5. Go/No-Go Gate** -- Hard statement plus authorization line:
> "Release is approved only if all mini-suite items pass and no stop-ship criteria are triggered. Otherwise rollback immediately and open a fix task."
>
> Release approval requires explicit sign-off by: the deployer, one admin-level tester, and (if production) superadmin.

**6. Known Intentional Warnings** -- `rate_limits` (no RLS), `audit_logs` / `error_events` (no INSERT/UPDATE/DELETE policies)

**7. Rollback Protocol** -- Code revert + emergency SQL examples (drop trigger, re-create policy, re-grant execute)

**8. Release Run Log Template** -- Copy/paste block with fields for date, environment, commit, migration head, testers, all mini-suite results, notes, and rollback decision

### Files changed

`.lovable/plan.md` only (append after Step 10)

### After appending

Run the preflight SQL queries once to record a baseline in the Release Run Log.

