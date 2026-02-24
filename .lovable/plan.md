

## Hardened Atomic Activation Toggle + Entitlement Cap Enforcement -- Implementation Plan

**Risk: RED** -- New database table, SECURITY DEFINER RPC functions, trigger on `personnel` table, changes to `handle_new_user`. Anchor required before publish.

All six pre-publish checks have been verified against the live codebase. No blockers remain.

---

### Pre-Publish Verification Summary

| Check | Status | Evidence |
|-------|--------|----------|
| handle_new_user derives business_id from DB lookup, not client input | Verified | `_business_id := _freelancer_invitation.business_id` from token lookup |
| Admin check is tenant-scoped | Verified | `has_role()` + `get_user_business_id()` resolve from `profiles.business_id` |
| RLS on personnel blocks cross-tenant access | Verified | `can_access_personnel()` enforces business_id match |
| Entitlements writes locked down | Will be enforced | RLS SELECT-only + REVOKE INSERT/UPDATE/DELETE |
| Enterprise unlimited is admin/service-role only | Correct | No client path to set `is_unlimited` |
| Soft enforcement (no auto-deactivation) | Correct | Block new activations, warn if over cap |

---

### Phase 1: Database Migration (single migration)

**A. Create `entitlements` table**

```text
business_id  UUID PK  (references businesses)
tier         TEXT NOT NULL DEFAULT 'starter'
is_active    BOOLEAN NOT NULL DEFAULT false
profile_cap  INTEGER NOT NULL DEFAULT 25
is_unlimited BOOLEAN NOT NULL DEFAULT false
updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
```

- Enable RLS
- SELECT policy: admin of same business
- No INSERT/UPDATE/DELETE policies
- REVOKE INSERT, UPDATE, DELETE ON entitlements FROM authenticated

**B. Create `get_business_entitlement(p_business_id UUID)`**
- STABLE, SECURITY DEFINER, SET search_path = 'public'
- Returns row or default: tier='starter', profile_cap=25, is_unlimited=false, is_active=false
- REVOKE ALL FROM PUBLIC; GRANT EXECUTE TO authenticated

**C. Create `activate_personnel(p_personnel_id UUID, p_category TEXT DEFAULT NULL)`**
- SECURITY DEFINER, SET search_path = 'public'
- Auth: has_role(admin) + business match
- If not found: RAISE PERSONNEL_NOT_FOUND (ERRCODE P0001)
- If already active: return early
- Lock: pg_advisory_xact_lock(hashtext(v_caller_business::text)::bigint)
- Cap check: if not is_unlimited and count >= profile_cap, RAISE PROFILE_CAP_REACHED (ERRCODE P0001)
- Set session flag, UPDATE activated=true
- Return JSON with success, active_count, profile_cap, tier, is_unlimited
- REVOKE ALL FROM PUBLIC; GRANT EXECUTE TO authenticated

**D. Create `deactivate_personnel(p_personnel_id UUID)`**
- SECURITY DEFINER, SET search_path = 'public'
- Same auth checks, set flag, update activated=false
- REVOKE ALL FROM PUBLIC; GRANT EXECUTE TO authenticated

**E. Create trigger `prevent_direct_activation_change()`**
- NOT SECURITY DEFINER, SET search_path = 'public'
- BEFORE INSERT OR UPDATE on personnel
- On UPDATE: if activated changes and session flag not set, RAISE ACTIVATION_VIA_RPC_ONLY (ERRCODE P0001)
- On INSERT: if activated=true and session flag not set, RAISE same

**F. Update `handle_new_user()` -- freelancer branch**
- Add advisory lock: pg_advisory_xact_lock(hashtext(_business_id::text)::bigint)
- Set session flag before insert
- Fetch entitlement, count activated
- If not unlimited and count >= cap: insert with activated=false
- Else: insert with activated=true

**G. Seed existing businesses**
- Insert default starter entitlement (cap=25) for all businesses without one

---

### Phase 2: Frontend Helper

**New file: `src/lib/entitlements.ts`**

- BusinessEntitlement interface (tier, is_active, profile_cap, is_unlimited)
- getBusinessEntitlement() function with safe default (starter, cap=25)

---

### Phase 3: Update ActivateProfileDialog.tsx

- Replace direct personnel UPDATE with supabase.rpc('activate_personnel')
- Replace direct personnel UPDATE with supabase.rpc('deactivate_personnel')
- Catch PROFILE_CAP_REACHED: show upgrade prompt
- Catch PERSONNEL_NOT_FOUND: show descriptive error

---

### Phase 4: Update ActivationOverview.tsx

Current state: shows "X / Y profiles activated" where Y = total personnel count, tier computed from active count via getCurrentTierIndex().

Changes:
- Fetch entitlement on mount via getBusinessEntitlement(businessId)
- Display: "Active: X | Plan cap: Y" (or "Unlimited" if is_unlimited)
- Progress bar: X / cap (capped at 100%)
- If activeCount > profile_cap and not unlimited: amber warning banner
- Tier highlight driven by entitlement.tier (not computed from count)

---

### Phase 5: Update AddPersonnelDialog.tsx (line 78)

Current: inserts with `activated: true`

Change to:
- Insert with `activated: false`
- Then call supabase.rpc('activate_personnel', { p_personnel_id: newPersonnel.id })
- If PROFILE_CAP_REACHED: personnel created but inactive, show message

---

### Phase 6: Update AdminOverview.tsx (line 151)

Current: inserts with `activated: true`

Change to:
- Insert with `activated: false`
- Then call supabase.rpc('activate_personnel', { p_personnel_id: newPersonnel.id })
- Handle cap error gracefully

---

### Files Summary

| File | Action |
|------|--------|
| Database migration | New table + RLS + REVOKE, 3 SECURITY DEFINER functions, 1 trigger, update handle_new_user, seed |
| src/lib/entitlements.ts | New |
| src/components/ActivateProfileDialog.tsx | Modified -- RPC calls, error handling |
| src/components/ActivationOverview.tsx | Modified -- cap-aware UI |
| src/components/AddPersonnelDialog.tsx | Modified -- insert inactive, then RPC |
| src/components/AdminOverview.tsx | Modified -- insert inactive, then RPC |

---

### Internal Documentation Note

**Active Profile** = `personnel.activated = true`

What inactive profiles cannot do:
- Cannot be assigned to projects (enforced by `can_assign_personnel_to_project` which calls `is_personnel_activated`)
- Cannot appear in project assignment lists
- Do not count toward billing

What inactive profiles can still do:
- Exist in the personnel list (visible to admins)
- Have certificates and documents stored
- Receive direct messages (if they have a user_id)
- Log in (if they have a user account)

