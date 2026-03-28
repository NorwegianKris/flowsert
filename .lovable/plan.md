

## Plan: Consolidate all cron jobs to pg_cron

### Current state

| Job | Schedule | Auth method | Issue |
|-----|----------|-------------|-------|
| `certificate-expiry-check` (jobid 2) | `0 8 * * *` | Anon key in `Authorization` header | Rejected by `x-internal-secret` guard — broken |
| `process-email-queue` (jobid 3) | Every 5s | Service role key from vault | Working correctly |
| `auto-close-projects` | Not in pg_cron | External cron with `x-internal-secret` header | Works but depends on external service |

Vault currently has only `email_queue_service_role_key`. No `internal_cron_secret` entry exists.

### Changes (3 steps, all via insert tool — no migrations)

**Step 1: Store `INTERNAL_CRON_SECRET` in vault**

Generate a new 64-char hex secret. Update the edge function secret via the secrets tool, then store it in vault:

```sql
SELECT vault.create_secret('<new_value>', 'internal_cron_secret');
```

**Step 2: Fix `certificate-expiry-check` cron job**

Unschedule the broken job and recreate it with the correct auth header, schedule changed from 08:00 to 07:00 UTC as intended:

```sql
SELECT cron.unschedule('certificate-expiry-check');

SELECT cron.schedule(
  'certificate-expiry-check',
  '0 7 * * *',
  $$
  SELECT net.http_post(
    url := 'https://frgsnallgwkufyzabeje.supabase.co/functions/v1/send-certificate-expiry-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-internal-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'internal_cron_secret' LIMIT 1)
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
```

**Step 3: Add `auto-close-projects` to pg_cron**

Schedule it daily at 02:00 UTC (matching the external service timing), using the same vault secret:

```sql
SELECT cron.schedule(
  'auto-close-projects',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://frgsnallgwkufyzabeje.supabase.co/functions/v1/auto-close-projects',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-internal-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'internal_cron_secret' LIMIT 1)
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
```

### After completion

- All three background jobs run inside pg_cron — no external cron service dependency
- Both `send-certificate-expiry-notifications` and `auto-close-projects` authenticate via vault-stored `INTERNAL_CRON_SECRET`
- The external cron service can be decommissioned
- Memory note `infrastructure/external-cron-automation` will be updated to reflect pg_cron is now used

### Risk

Schema-adjacent change (Q2) — **anchor required**. Secret rotation affects `auto-close-projects` immediately, but since we're adding it to pg_cron in the same pass, there's no gap.

