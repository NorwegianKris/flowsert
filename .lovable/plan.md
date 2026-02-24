

## Request STRIPE_WEBHOOK_SECRET via Secure Input

**Risk: GREEN** -- No code or schema changes. Secret configuration only.

---

### What happens when you approve this plan

1. A secure input modal will appear prompting you to enter your **STRIPE_WEBHOOK_SECRET** (the `whsec_...` value from Stripe Dashboard > Developers > Webhooks > your endpoint > Signing secret)

2. The following URL secrets will also be configured:
   - `STRIPE_SUCCESS_URL` = `https://flowsert.lovable.app/admin?billing=success`
   - `STRIPE_CANCEL_URL` = `https://flowsert.lovable.app/admin?billing=canceled`
   - `STRIPE_PORTAL_RETURN_URL` = `https://flowsert.lovable.app/admin`

3. After secrets are saved, the full billing implementation (database migration, edge functions, frontend) will proceed in the next step.

### No code changes in this step

