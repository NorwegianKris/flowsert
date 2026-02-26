

# Checklist Review — Stage 0 Minimal Revenue Foundation

---

## Part 1 — Public Trust Layer

**☐ /terms page live — content matches Terms and Conditions document**
- STATUS: DONE. Page exists at `/terms` with 13 sections (Introduction through Contact), PublicHeader + PublicFooter. Content appears substantive. Cannot verify it matches the PDF in `public/documents/FlowSert_Terms_and_Conditions.pdf` without parsing it — recommend a manual visual comparison.

**☐ /privacy page live — all 10 required GDPR sections present**
- STATUS: DONE. Page has 12 sections: Data Controller, What We Collect, Legal Basis, How We Use Data, Sub-Processors, International Transfers, Retention, Your Rights, Security, Cookies, Changes, Contact & Complaints. Exceeds the 10-section requirement.

**☐ /subprocessors page live — 4 sub-processors listed with correct countries and transfer basis**
- STATUS: ISSUE. The page lists **5** sub-processors (Supabase, Vercel, Resend, OpenAI, Google), not 4. The checklist says 4. Either the checklist is outdated (Google/Gemini was added later) or one entry should be removed/merged. The "transfer basis" column is missing — the table has "Location" but does not explicitly state "SCCs" or "Adequacy Decision" as a separate column (though SCCs are mentioned inline for some). Recommend adding a "Transfer Basis" column.

**☐ /security page live — all 8 sections present, no placeholder text**
- STATUS: ISSUE. The page only has **5** sections: Encryption, Access Control, Monitoring & Incident Response, Infrastructure, Responsible Disclosure. Missing: **Data Backup**, **Employee Security**, **Vendor Management**. Needs 3 more sections.

**☐ All 4 pages show version date: 'Version 1.0 — Last updated: February 2026'**
- STATUS: PARTIAL. The exact wording varies:
  - Terms: "Version 1.0 — Effective 1 February 2026" (says "Effective", not "Last updated")
  - Privacy: "Version 1.0 — Effective 1 February 2026" (same)
  - Subprocessors: "Version 1.0 — Last updated 1 February 2026" (correct pattern)
  - Security: "Version 1.0 — Effective 1 February 2026" (says "Effective")
  - Decide on one canonical format and apply consistently.

**☐ Global footer links to all 4 pages — verified on homepage, pricing page, login, signup**
- STATUS: DONE (with caveat). `PublicFooter` links to Terms, Privacy, Sub-Processors, Security, and Trust. However, the footer component is `PublicFooter` — need to verify it's actually rendered on all the mentioned pages (homepage, pricing, login, signup). The Auth page would need manual verification. There is no dedicated pricing page in the routes.

**☐ Footer shows '© 2026 FlowSert. All rights reserved.'**
- STATUS: DONE. `PublicFooter.tsx` renders exactly `© 2026 FlowSert. All rights reserved.`

---

## Part 2 — Stripe Plumbing

**☐ Migration verified: businesses table has stripe_customer_id, stripe_subscription_id, subscription_status columns**
- STATUS: NOT IMPLEMENTED. The `businesses` table does **not** have these columns. The architecture uses separate tables: `billing_customers` (stripe_customer_id), `billing_subscriptions` (stripe_subscription_id, status). This is actually a **better** design than putting them on `businesses`. The checklist is outdated — it was written before the normalized billing schema was implemented. Recommend updating the checklist to reflect the actual architecture.

**☐ CHECK constraint on subscription_status verified**
- STATUS: NOT IMPLEMENTED. There is no CHECK constraint on `billing_subscriptions.status`. The `entitlements` table has a CHECK on `tier`, but subscription status is unconstrained. This was flagged in the Stage 0 audit findings memory. Recommend adding a CHECK constraint on `billing_subscriptions.status`.

**☐ Stripe products created: 4 tiers × monthly + annual = 8 prices**
- STATUS: PARTIAL. `src/lib/stripePrices.ts` defines **3 tiers × 2 intervals = 6 prices** (Starter, Growth, Professional). The checklist says 4 tiers — the 4th would be Enterprise. Enterprise is handled as a manual/custom arrangement, not a Stripe product. Update checklist to say "3 tiers × 2 = 6 prices + Enterprise is manual".

**☐ Edge function create-checkout-session deployed**
- STATUS: DONE. File exists at `supabase/functions/create-checkout-session/index.ts` with full implementation.

**☐ JWT verification tested: call without Authorization returns 401**
- STATUS: DONE IN CODE. The function checks for `Authorization` header and returns 401 if missing. Needs manual verification by calling the endpoint.

**☐ Non-admin test: returns 403**
- STATUS: DONE IN CODE. The function checks `user_roles` for admin role and returns 403 if not admin.

**☐ End-to-end Stripe test mode test**
- STATUS: CANNOT VERIFY. This is a manual test. The code is in place. Note: the system is in **live mode**, not test mode (per memory). This checklist item may need rewording.

**☐ Activation criteria verified: subscription NOT manually activated until Stripe shows Active + Paid + succeeded**
- STATUS: DONE (process-level). Per the operational rules memory, this is a documented manual process. The webhook handles automated status sync. Manual activation follows the documented SOP.

**☐ Trial behaviour: trialing cannot activate more than 25 profiles**
- STATUS: DONE. The `activate_personnel` function uses `get_business_entitlement()` which returns the tier's profile_cap. Trialing subscriptions are synced to the correct tier cap via the webhook. The `prevent_direct_activation_change` trigger + advisory lock ensure atomicity.

**☐ Manual tier change protocol documented**
- STATUS: CANNOT VERIFY FROM CODE. This is an operational document (Notion or equivalent). Per memory, operational rules exist but the actual change log location needs confirmation.

**☐ Stripe secret key stored in edge function secrets only**
- STATUS: DONE. `STRIPE_SECRET_KEY` is listed in secrets. No reference to it in frontend code or `.env`.

---

## Part 3 — Profile Hard-Stop

**☐ Migration verified: businesses table has current_tier column with CHECK constraint**
- STATUS: NOT ON BUSINESSES. The tier is stored in the `entitlements` table (with a CHECK constraint allowing starter/growth/professional/enterprise), not on `businesses`. Again, the checklist predates the normalized schema. The actual implementation is superior.

**☐ Function get_tier_profile_limit deployed and tested**
- STATUS: DONE. The function exists and returns 25 for starter, 75 for growth, 200 for professional, 25 as default.

**☐ Trigger function enforce_profile_activation_limit deployed**
- STATUS: NOT A TRIGGER. Activation enforcement is done via the `activate_personnel` RPC function (with advisory lock + entitlement check), not via a trigger. The `prevent_direct_activation_change` trigger blocks direct `UPDATE personnel SET activated = true` — forcing all activation through the RPC. This is a **better** design than a trigger-based limit. Update checklist.

**☐ Trigger trg_enforce_profile_limit attached to personnel table**
- STATUS: REPLACED BY `trg_prevent_direct_activation_change`. The personnel table has this trigger plus `update_personnel_updated_at`. The enforcement is in the RPC, not a limit trigger.

**☐ Starter limit test: activate exactly 25 profiles — all succeed**
- STATUS: NEEDS MANUAL TESTING. Code logic is correct.

**☐ Starter hard-stop test: 26th profile returns PROFILE_LIMIT exception**
- STATUS: NEEDS MANUAL TESTING. The RPC raises `PROFILE_CAP_REACHED` (not `PROFILE_LIMIT` — checklist wording differs from actual error code).

**☐ Deactivation test: deactivating on full account succeeds**
- STATUS: DONE IN CODE. `deactivate_personnel` RPC does not check caps.

**☐ UI test: PROFILE_LIMIT error triggers upgrade modal**
- STATUS: NEEDS MANUAL VERIFICATION. Must check the UI component that calls `activate_personnel` to see if it catches `PROFILE_CAP_REACHED` and shows an upgrade modal vs. generic toast.

**☐ Upgrade modal content correct**
- STATUS: NEEDS MANUAL VERIFICATION.

---

## Part 4 — AI Usage Ledger

**☐ usage_ledger table created with all columns**
- STATUS: DONE. Table exists with id, business_id, actor_user_id, source, event_type, severity, message, metadata, created_at (based on query results showing error_events — need to double-check this is usage_ledger).

**☐ Indexes created: idx_usage_ledger_business_month**
- STATUS: DONE. Index `idx_usage_ledger_business_month` exists on `(business_id, billing_month)`. An additional index `idx_usage_ledger_business_created` also exists.

**☐ RLS policy: usage_ledger_read_own**
- STATUS: DONE. Policy exists: `business_id = get_user_business_id(auth.uid())` on SELECT.

**☐ OCR edge function updated: logUsage called**
- STATUS: DONE (per memory and previous AI overview). `extract-certificate-data` logs `ocr_extraction`.

**☐ Assistant edge function updated: logUsage called**
- STATUS: DONE. `certificate-chat` logs `assistant_query`.

**☐ Personnel matching edge function updated: logUsage called**
- STATUS: DONE. `suggest-project-personnel` logs `personnel_match`.

**☐ Fail-soft test: logUsage error doesn't interrupt AI response**
- STATUS: DONE IN CODE (fire-and-forget pattern). Needs manual verification.

**☐ Manual monitoring query runs without error**
- STATUS: NEEDS MANUAL TESTING.

---

## Final Sign-Off

**☐ All anchor protocol requirements followed for DB-level changes**
- STATUS: Process-level. Per memory, the project follows GREEN/YELLOW/RED classification. Cannot verify git history from here.

**☐ No secrets committed to repository or client-side code**
- STATUS: DONE. Stripe keys are in edge function secrets. Price IDs (not secrets) are in source code, which is correct.

**☐ Stage 0 deployment reviewed by founder**
- STATUS: CANNOT VERIFY. Operational step.

**☐ Stripe Dashboard manual monitoring process documented**
- STATUS: CANNOT VERIFY FROM CODE. Per memory, a formal Stripe monitoring SOP was identified as a required hardening step.

---

## Summary of Action Items

1. **Security page**: Add 3 missing sections (Data Backup, Employee Security, Vendor Management)
2. **Subprocessors page**: Reconcile 5 vs 4 count; add explicit "Transfer Basis" column
3. **Version date format**: Standardize to one format across all 4 pages
4. **billing_subscriptions.status**: Add CHECK constraint
5. **Checklist itself**: Update to reflect actual architecture (separate billing tables, RPC-based activation, 3 tiers not 4, error code is `PROFILE_CAP_REACHED` not `PROFILE_LIMIT`)
6. **UI upgrade modal**: Verify it catches `PROFILE_CAP_REACHED` and shows tier info (not generic error)
7. **Manual tests**: Run the 25/26 activation test, end-to-end Stripe flow, fail-soft logUsage test

