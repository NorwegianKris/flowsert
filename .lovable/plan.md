

## Fix: Add AI usage caps to Stripe webhook entitlement sync

Single file change: `supabase/functions/stripe-webhook/index.ts`

### A. TIER_MAP (lines 19–29) → extend type and add 3 cap fields per entry

```typescript
const TIER_MAP: Record<string, { tier: string; profile_cap: number; is_unlimited: boolean; monthly_ocr_cap: number; monthly_chat_cap: number; monthly_search_cap: number }> = {
  // Starter
  "price_1T4TiBCTVQHwswgoMCQBB0Kv": { tier: "starter",      profile_cap: 25,  is_unlimited: false, monthly_ocr_cap: 50,  monthly_chat_cap: 200,    monthly_search_cap: 50 },     // Monthly
  "price_1T4TipCTVQHwswgo3i7Wxi0p": { tier: "starter",      profile_cap: 25,  is_unlimited: false, monthly_ocr_cap: 50,  monthly_chat_cap: 200,    monthly_search_cap: 50 },     // Annual
  // Growth
  "price_1T4TjxCTVQHwswgobYyRRe10": { tier: "growth",       profile_cap: 75,  is_unlimited: false, monthly_ocr_cap: 200, monthly_chat_cap: 500,    monthly_search_cap: 200 },    // Monthly
  "price_1T4TkFCTVQHwswgop7yCPQRM": { tier: "growth",       profile_cap: 75,  is_unlimited: false, monthly_ocr_cap: 200, monthly_chat_cap: 500,    monthly_search_cap: 200 },    // Annual
  // Professional
  "price_1T4TksCTVQHwswgoItMP8J6n": { tier: "professional", profile_cap: 200, is_unlimited: false, monthly_ocr_cap: 500, monthly_chat_cap: 999999, monthly_search_cap: 999999 }, // Monthly
  "price_1T4Tl8CTVQHwswgoHkYuB2S9": { tier: "professional", profile_cap: 200, is_unlimited: false, monthly_ocr_cap: 500, monthly_chat_cap: 999999, monthly_search_cap: 999999 }, // Annual
};
```

### B. DEFAULT_ENTITLEMENT (lines 31–36) → add 3 cap fields set to 0

```typescript
const DEFAULT_ENTITLEMENT = {
  tier: "starter",
  is_active: false,
  profile_cap: 25,
  is_unlimited: false,
  monthly_ocr_cap: 0,
  monthly_chat_cap: 0,
  monthly_search_cap: 0,
};
```

### C. syncEntitlements upserts

**Line 105 (downgrade):** No code change needed — spreads `DEFAULT_ENTITLEMENT` which now includes the 3 cap fields at 0.

**Line 122 (unknown tier fallback):**
```typescript
{ business_id: businessId, tier: "starter", is_active: true, profile_cap: 25, is_unlimited: false, monthly_ocr_cap: 50, monthly_chat_cap: 200, monthly_search_cap: 50 },
```

**Lines 132–138 (mapped tier):**
```typescript
{
  business_id: businessId,
  tier: mapped.tier,
  is_active: true,
  profile_cap: mapped.profile_cap,
  is_unlimited: mapped.is_unlimited,
  monthly_ocr_cap: mapped.monthly_ocr_cap,
  monthly_chat_cap: mapped.monthly_chat_cap,
  monthly_search_cap: mapped.monthly_search_cap,
},
```

### Verification checklist
- Professional chat and search: **999999** (not null) ✓
- DEFAULT_ENTITLEMENT: all three caps **0** ✓
- All 3 upsert locations include the 3 cap columns ✓
- No other logic changed ✓

### Risk: 🔴 Edge function + entitlements writes → anchor before deploy. No schema migration needed.

