

# Part 3 Proof: Profile Hard-Stop Verification

## Current State

- **Only business**: Techno Dive (38672512-...), enterprise tier, `is_unlimited=true`, 157 active, 157 total
- **CHECK constraint**: `entitlements_tier_check` — validated, enforces `starter|growth|professional|enterprise`
- **`get_tier_profile_limit()`**: Working correctly (25/75/200/2147483647)
- **Problem**: All 157 personnel are active. To test Starter cap (25), we'd need to deactivate 132 profiles and then re-test. This is destructive to production data.

## Recommended Test Approach

Since this is a production database with real data, the safest approach is a **controlled temporary test** — not a full 25-profile walkthrough but targeted verification of each guard:

### Test A: Starter limit enforcement (DB-level proof)

Temporarily set Techno Dive to `tier='starter', profile_cap=25, is_unlimited=false`. Then call `activate_personnel` on an already-inactive profile (if any exist) or attempt the RPC directly. Since 157 are already active (above cap), any new activation must be blocked.

**This actually proves both A and B simultaneously** — the cap is 25, active count is 157, so the very first activation attempt hits `PROFILE_CAP_REACHED`.

### Test B: 26th activation blocked

Covered by Test A above — with 157 active and cap at 25, any activation is blocked.

### Test C: Deactivation works at cap

While still at starter/25 with 157 active, call `deactivate_personnel` on one profile. Must succeed. Then reactivate it after restoring enterprise.

### Test D: UI upgrade modal behavior

Code review confirms: `ActivateProfileDialog` catches `PROFILE_CAP_REACHED` and renders a styled "Plan Limit Reached" warning with amber border, not a generic toast. The `BillingSection` renders plan cards with checkout CTAs. This is a code-level PASS — live UI testing requires you to trigger it in the browser.

### Test E: Enterprise/unlimited bypass

Restore `is_unlimited=true` — confirm activation succeeds again.

## Execution Steps

1. **Temporarily downgrade entitlement** (will NOT affect existing active profiles — soft enforcement):
   ```sql
   UPDATE entitlements 
   SET tier='starter', profile_cap=25, is_unlimited=false 
   WHERE business_id='38672512-2331-4546-8bc4-de942605fce1';
   ```

2. **Test A+B**: Call `activate_personnel` via the app on any inactive profile (or if none exist, deactivate one first, then try to re-activate). Expect `PROFILE_CAP_REACHED`.

3. **Test C**: Call `deactivate_personnel` on one active profile. Expect success.

4. **Test E**: Restore enterprise:
   ```sql
   UPDATE entitlements 
   SET tier='enterprise', profile_cap=9999, is_unlimited=true 
   WHERE business_id='38672512-2331-4546-8bc4-de942605fce1';
   ```
   Then re-activate the deactivated profile. Expect success.

5. **Test D**: Code-level verified. The `capReached` state triggers a dedicated UI panel (not a toast) with "Plan Limit Reached" header and upgrade guidance pointing to BillingSection plan cards.

## Risk Assessment

- **YELLOW**: Temporarily changing entitlement tier on production. The window is <60 seconds. Existing active profiles are unaffected (soft enforcement — grandfathered). Only new activations are blocked.
- No schema changes required.
- No RLS changes.
- Fully reversible.

## What I Can Do vs What You Must Do

| Test | I can verify | You must verify |
|------|-------------|----------------|
| A+B: Cap blocks activation | ✅ DB function logic confirmed | Try activating in UI while at starter |
| C: Deactivation at cap | ✅ Code path confirmed | Click deactivate in UI |
| D: Upgrade modal (not toast) | ✅ Code review PASS | See it visually in browser |
| E: Enterprise bypass | ✅ Logic confirmed | Try activating after restore |

## Implementation

I will execute the temporary downgrade, run the RPC tests via SQL to prove the guards work at the database level, then restore enterprise. This gives you deterministic proof without requiring 25+ UI clicks.

