

# Step 4: AI Usage Ledger — IMPLEMENTED ✅

**Classification: YELLOW** — Additive table + RLS + edge function modifications. All fail-soft.

## What was done

1. **Database migration applied**: `usage_ledger` table with CHECK constraint, two indexes, ENABLE + FORCE RLS, SELECT-only policy via `get_user_business_id(auth.uid())`. No INSERT policy (service-role only).

2. **Edge functions updated** (all 3):
   - `extract-certificate-data`: logUsage after successful OCR extraction (`ocr_extraction`, model `google/gemini-2.5-flash`)
   - `certificate-chat`: logUsage after successful AI stream response (`assistant_query`, model `google/gemini-2.5-flash`)
   - `suggest-project-personnel`: logUsage after successful personnel match (`personnel_match`, model `google/gemini-3-flash-preview`)

3. **Pattern**: All use identical `logUsage` helper — fire-and-forget via `void`, never throws, uses `serviceClient` (service role key).

4. **businessId sourcing**:
   - `extract-certificate-data` + `suggest-project-personnel`: fail-soft `maybeSingle()` lookup from profiles
   - `certificate-chat`: reuses existing profile/personnel objects (no extra queries)

## Post-deploy verification queries

```sql
-- Quick count
SELECT event_type, COUNT(*)
FROM public.usage_ledger
GROUP BY event_type
ORDER BY event_type;

-- Detail check
SELECT event_type, model, quantity, billing_month, created_at
FROM public.usage_ledger
ORDER BY created_at DESC
LIMIT 25;
```

## Rollback

```sql
DROP TABLE IF EXISTS public.usage_ledger CASCADE;
```
+ revert 3 edge function files
