

# Checklist Review — Stage 0 Minimal Revenue Foundation (REVISED)

> Updated 26 February 2026 — reflects actual architecture

---

## Part 1 — Public Trust Layer

- [x] /terms page live — content matches Terms and Conditions document
- [x] /privacy page live — all 10 required GDPR sections present (12 sections implemented)
- [x] /subprocessors page live — 5 sub-processors listed with correct countries and Transfer Basis column
- [x] /security page live — all 8 sections present, no placeholder text
- [x] All 4 pages show version date: 'Version 1.0 — Last updated: February 2026'
- [x] Global footer links to all 4 pages (Terms, Privacy, Sub-Processors, Security, Trust)
- [x] Footer shows '© 2026 FlowSert. All rights reserved.'

---

## Part 2 — Stripe Plumbing

- [x] Billing schema verified: `billing_customers` (stripe_customer_id), `billing_subscriptions` (stripe_subscription_id, status), `entitlements` (tier, profile_cap)
- [x] CHECK constraint on `billing_subscriptions.status` verified (active, canceled, incomplete, incomplete_expired, past_due, trialing, unpaid, paused)
- [x] Stripe products created: 3 tiers × 2 intervals = 6 prices (Starter, Growth, Professional). Enterprise is manual/custom.
- [x] Edge function `create-checkout-session` deployed
- [x] JWT verification in code: missing Authorization → 401
- [x] Non-admin check in code: non-admin user → 403
- [ ] End-to-end Stripe flow tested manually (system is in live mode)
- [x] Activation criteria: subscription NOT manually activated until Stripe shows Active + Paid + succeeded (operational SOP)
- [x] Trial behaviour: trialing accounts subject to Starter tier cap (25 profiles)
- [ ] Manual tier change protocol documented in internal log
- [x] Stripe secret key stored in edge function secrets only

---

## Part 3 — Profile Hard-Stop

- [x] Tier stored in `entitlements` table with CHECK constraint (starter/growth/professional/enterprise)
- [x] Function `get_tier_profile_limit` deployed: returns 25/75/200 for starter/growth/professional
- [x] Activation enforcement via `activate_personnel` RPC (advisory lock + entitlement check). Error: `PROFILE_CAP_REACHED`
- [x] `trg_prevent_direct_activation_change` trigger blocks direct UPDATE on `personnel.activated`
- [ ] Starter limit test: activate exactly 25 profiles — all succeed (needs manual test)
- [ ] Starter hard-stop test: 26th profile returns `PROFILE_CAP_REACHED` (needs manual test)
- [x] Deactivation test: `deactivate_personnel` RPC does not check caps
- [x] UI: `PROFILE_CAP_REACHED` error shows upgrade callout with "View Plans →" link (not generic toast)

---

## Part 4 — AI Usage Ledger

- [x] `usage_ledger` table created with all columns
- [x] Index `idx_usage_ledger_business_month` exists
- [x] RLS policy `usage_ledger_read_own` applied
- [x] OCR edge function: `logUsage('ocr_extraction')` called
- [x] Assistant edge function: `logUsage('assistant_query')` called
- [x] Personnel matching edge function: `logUsage('personnel_match')` called
- [x] Fail-soft: logUsage is fire-and-forget (needs manual verification)
- [ ] Manual monitoring query tested in SQL editor

---

## Final Sign-Off

- [x] No secrets committed to repository or client-side code
- [ ] Stage 0 deployment reviewed by founder
- [ ] Stripe Dashboard manual monitoring SOP documented

---

## Remaining Manual Tests

1. End-to-end Stripe checkout flow (live mode)
2. Activate 25 profiles → verify all succeed → attempt 26th → verify `PROFILE_CAP_REACHED`
3. Run monitoring query in SQL editor
4. Fail-soft logUsage test
5. Manual visual comparison: /terms page vs PDF document
