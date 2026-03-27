

## Plan: Schedule certificate expiry notifications via pg_cron

### Context

This project runs on Lovable Cloud. According to project memory, **pg_cron and pg_net are unavailable** on the current tier. The existing `auto-close-projects` function already uses an external cron service pattern with `INTERNAL_CRON_SECRET` header authentication.

### Recommendation

**Do not create a migration with `cron.schedule`** -- it will fail if pg_cron is not enabled. Instead, follow the same pattern already used for `auto-close-projects`:

1. **Add secret-based authentication** to `send-certificate-expiry-notifications` (it currently has none -- anyone can call it)
2. **Register with an external cron service** (e.g., cron-job.org) to call the function daily at 07:00 UTC

### Changes

**1. `supabase/functions/send-certificate-expiry-notifications/index.ts`**
- Add `INTERNAL_CRON_SECRET` header check at the top of the handler, matching the `auto-close-projects` pattern
- Add `x-internal-secret` to the CORS extra allowed headers
- This prevents unauthorized invocation

**2. External cron setup (manual step)**
Configure the external cron service to make a POST request to:
```
https://frgsnallgwkufyzabeje.supabase.co/functions/v1/send-certificate-expiry-notifications
```
With headers:
- `Content-Type: application/json`
- `x-internal-secret: <value of INTERNAL_CRON_SECRET>`

Schedule: `0 7 * * *` (daily at 07:00 UTC)

### If you want to try pg_cron instead

To check whether pg_cron is available, you would need to enable the `pg_cron` and `pg_net` extensions via the backend extensions settings. If they are available, a migration can be created to schedule the job. However, based on prior experience with this project, these extensions are not available on the current tier.

### Risk
Edge function change (Q2) -- **anchor required**. Adding auth guard is a security improvement.

