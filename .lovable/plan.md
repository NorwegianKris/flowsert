

# Clean Up Test-Mode Billing Data

## What we found

Business `38672512-2331-4546-8bc4-de942605fce1` has test-mode Stripe data:

- **billing_customers**: 1 row (`cus_U2WuEddEsGCQ3d`)
- **billing_subscriptions**: 1 row (`sub_1T4SbSCTZs6lfaVYZf2axohZ`, status: trialing)
- **billing_events**: 4 rows (test-mode webhook events)

## Plan

Delete all three sets of test-mode records so the billing UI shows "No subscription" and is ready for live-mode checkout:

1. `DELETE FROM billing_customers WHERE business_id = '38672512-...'`
2. `DELETE FROM billing_subscriptions WHERE business_id = '38672512-...'`
3. `DELETE FROM billing_events WHERE business_id = '38672512-...'`

The entitlements row does not need deletion — the webhook will re-sync it on the first live subscription event.

## Security anchors

- Q1 (SQL): Data deletion — anchor recommended.
- GREEN classification: deleting stale test data only, no schema change.
- No code changes required.

| Table | Rows deleted |
|-------|-------------|
| billing_customers | 1 |
| billing_subscriptions | 1 |
| billing_events | 4 |

