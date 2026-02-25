

# Set Platform Owner Business to Unlimited Entitlement

## What this does

A single data update to the `entitlements` table for your business, setting it to an unlimited enterprise tier so you can continue testing and building without hitting any profile cap.

## Change

**Data update** (not a schema migration):

Update the `entitlements` row for business `38672512-2331-4546-8bc4-de942605fce1`:
- `tier` → `'enterprise'`
- `is_active` → `true`
- `is_unlimited` → `true`
- `profile_cap` → `9999` (fallback safety value; `is_unlimited` takes precedence)

If no row exists yet, insert one with those values.

## Scope

- Q1 (SQL): Yes, but this is a data update, not a schema change — 🟢 safe
- No code changes required — the UI and enforcement logic already handle the `enterprise` / `is_unlimited` state correctly
- Your 157 active profiles will remain unaffected, and new activations will no longer be blocked

