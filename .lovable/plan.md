

# Step 4: AI Usage Ledger — Implementation Plan

**Classification: YELLOW** — Additive table + RLS + edge function modifications. All fail-soft.

## Execution Order

1. Apply SQL migration (create `usage_ledger` table)
2. Deploy all 3 edge function changes
3. Trigger each AI function once
4. Run sanity queries

## 1. Database Migration

Single migration creating the table, indexes, RLS with FORCE, and idempotent SELECT policy. No INSERT policy -- inserts are service-role only.

```sql
CREATE TABLE IF NOT EXISTS public.usage_ledger (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  event_type    text NOT NULL
    CHECK (event_type IN (
      'ocr_extraction',
      'assistant_query',
      'personnel_match',
      'email_sent'
    )),
  quantity      bigint NOT NULL DEFAULT 1,
  model         text,
  billing_month date NOT NULL DEFAULT date_trunc('month', now())::date,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_usage_ledger_business_month
  ON public.usage_ledger (business_id, billing_month);
CREATE INDEX IF NOT EXISTS idx_usage_ledger_business_created
  ON public.usage_ledger (business_id, created_at DESC);

ALTER TABLE public.usage_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_ledger FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS usage_ledger_read_own ON public.usage_ledger;
CREATE POLICY usage_ledger_read_own
  ON public.usage_ledger FOR SELECT TO authenticated
  USING (business_id = public.get_user_business_id(auth.uid()));
```

Rollback: `DROP TABLE IF EXISTS public.usage_ledger CASCADE;`

## 2. Shared `logUsage` helper (added to all 3 edge functions)

Identical function, fire-and-forget, never throws:

```ts
async function logUsage(params: {
  serviceClient: ReturnType<typeof createClient>;
  businessId: string;
  eventType: "ocr_extraction" | "assistant_query" | "personnel_match" | "email_sent";
  quantity?: number;
  model?: string | null;
}) {
  try {
    const billingMonth = new Date();
    billingMonth.setDate(1);
    billingMonth.setHours(0, 0, 0, 0);
    await params.serviceClient.from("usage_ledger").insert({
      business_id: params.businessId,
      event_type: params.eventType,
      quantity: params.quantity ?? 1,
      model: params.model ?? null,
      billing_month: billingMonth.toISOString().slice(0, 10),
    });
  } catch (err) {
    console.error("[usage_ledger] non-fatal logging error:", err);
  }
}
```

## 3. Per-function changes

### `extract-certificate-data/index.ts`

- Add `logUsage` function after `writeErrorEvent` (after line 58)
- After `serviceClient` creation (line 93), add fail-soft businessId lookup:
  ```ts
  let businessId: string | null = null;
  try {
    const { data } = await serviceClient
      .from("profiles").select("business_id")
      .eq("id", userId).maybeSingle();
    businessId = data?.business_id ?? null;
  } catch (_) { businessId = null; }
  ```
- After `result` is built (line 364), before the return on line 366:
  ```ts
  if (businessId) {
    void logUsage({
      serviceClient, businessId,
      eventType: "ocr_extraction",
      model: "google/gemini-2.5-flash",
    });
  }
  ```

### `certificate-chat/index.ts`

- Add `logUsage` function after `writeErrorEvent` (after line 310)
- Hoist `let businessId: string | null = null;` before the `if (isAdmin)` block (before line 396)
- Admin branch: after line 404 check, assign `businessId = profile?.business_id ?? null;`
- Worker branch: after line 462 personnel check, safely assign:
  ```ts
  businessId = (personnel && "business_id" in personnel)
    ? (personnel as { business_id?: string }).business_id ?? null
    : null;
  ```
- After confirming `response.ok` (line 593), before returning stream (line 595):
  ```ts
  if (businessId) {
    void logUsage({
      serviceClient, businessId,
      eventType: "assistant_query",
      model: "google/gemini-2.5-flash",
    });
  }
  ```
- No new DB queries -- reuses existing profile/personnel objects.

### `suggest-project-personnel/index.ts`

- Add `logUsage` function after `writeErrorEvent` (after line 73)
- After `serviceClient` creation (line 107), add fail-soft businessId lookup (same pattern as extract)
- After result is validated and filtered (line 368), before return on line 370:
  ```ts
  if (businessId) {
    void logUsage({
      serviceClient, businessId,
      eventType: "personnel_match",
      model: "google/gemini-3-flash-preview",
    });
  }
  ```

## 4. Post-deploy verification

```sql
-- Quick count (expect 3 rows after triggering each function once)
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

If 0 rows: check serviceClient uses `SUPABASE_SERVICE_ROLE_KEY` (confirmed at lines 92-93, 106-107, 348-349) and that businessId is not null.

## Risk Assessment

| Check | Result |
|---|---|
| Destructive changes | None -- purely additive |
| All `void logUsage(...)` | Yes, consistent fire-and-forget |
| `maybeSingle()` + try/catch | Yes, for extract + suggest lookups |
| certificate-chat reuses existing data | Yes, no extra queries |
| Rollback | `DROP TABLE IF EXISTS public.usage_ledger CASCADE;` + revert 3 edge functions |

