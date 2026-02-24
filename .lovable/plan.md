
Goal
- Restore successful Stripe webhook verification and stop HTTP 400 “Invalid signature” responses.

What I found (anchored evidence)
- 🔴 Anchor 1 (edge function code): `supabase/functions/stripe-webhook/index.ts` currently uses synchronous signature verification:
  - `event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);`
- 🔴 Anchor 2 (runtime logs): Latest `stripe-webhook` logs show:
  - `SubtleCryptoProvider cannot be used in a synchronous context. Use await constructEventAsync(...) instead of constructEvent(...)`
- This means failures are not only from secret mismatch; the current code path itself is incompatible in this runtime and will keep returning 400 even with a correct secret.

Implementation plan (after approval)
1) Secret re-entry flow (requested by you)
- I will guide and trigger the secret re-entry flow for `STRIPE_WEBHOOK_SECRET` using the available secure secret workflow.
- You’ll paste the `whsec_...` from Stripe Test mode webhook endpoint signing secret.
- Confirmation checkpoint: verify the secret key name is exactly `STRIPE_WEBHOOK_SECRET` (case-sensitive, no extra spaces/newlines).

2) Webhook verification fix in code
- Update `supabase/functions/stripe-webhook/index.ts`:
  - Replace `constructEvent(...)` with `await constructEventAsync(...)`.
  - Keep raw body handling via `await req.text()` (already correct).
  - Add a defensive startup/runtime check for missing `STRIPE_WEBHOOK_SECRET` to return a clear operational error message (instead of opaque 400s).
- Keep existing idempotency and event-processing logic unchanged.

3) Restart/redeploy webhook function
- Redeploy/restart `stripe-webhook` so it reloads environment variables and new verification logic.
- This ensures both new secret + async signature verification are active.

4) End-to-end validation
- Send Stripe test webhook events (at minimum):
  - `checkout.session.completed`
  - `customer.subscription.updated`
- Verify expected outcomes:
  - No “Invalid signature” log entries.
  - “Event received” + downstream processing logs appear.
  - Rows are inserted/updated correctly in:
    - `billing_events`
    - `billing_subscriptions`
    - `entitlements` (for subscription events)

5) Fast rollback/triage if still failing
- If 400 persists:
  - Confirm Stripe endpoint is pointing to the exact deployed webhook URL.
  - Confirm test-mode secret is used with test-mode events (and live with live).
  - Re-check `stripe-signature` header presence in incoming request logs.
  - Inspect latest webhook event payload + headers to isolate mismatch source quickly.

Risks and mitigations
- Risk: Secret is correct but old code path remains deployed.
  - Mitigation: explicit redeploy after code change.
- Risk: Test/live mode mismatch in Stripe dashboard.
  - Mitigation: validate endpoint + mode during post-deploy checks.
- Risk: Hidden whitespace in pasted secret.
  - Mitigation: re-paste and save once; test immediately after.

Expected result
- Webhook signature verification succeeds (HTTP 200 for valid events), and billing sync resumes reliably without repeated 400 invalid signature failures.
