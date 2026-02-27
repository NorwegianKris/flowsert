

## Plan: Monthly AI Allowance Enforcement with 80% Warning

### Migration (single SQL migration)

**1. ALTER entitlements** — add three cap columns:
```sql
ALTER TABLE public.entitlements
  ADD COLUMN IF NOT EXISTS monthly_ocr_cap integer NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS monthly_chat_cap integer NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS monthly_search_cap integer NOT NULL DEFAULT 200;
```

**2. Set tier defaults** (only `starter` and `enterprise` exist currently):
```sql
UPDATE public.entitlements SET monthly_ocr_cap = 200, monthly_chat_cap = 500, monthly_search_cap = 1000 WHERE tier = 'starter';
UPDATE public.entitlements SET monthly_ocr_cap = 2147483647, monthly_chat_cap = 2147483647, monthly_search_cap = 2147483647 WHERE tier = 'enterprise';
```

Future tiers (`growth`, `professional`) will get defaults from the column default when rows are created.

**3. SQL function** `check_ai_allowance`:
- Receives `p_business_id uuid` and `p_event_type text` (`'ocr'`, `'chat'`, `'search'`)
- Maps internally: `'ocr'` → counts `usage_ledger` rows where `event_type = 'ocr_extraction'`, `'chat'` → `'assistant_query'`, `'search'` → `'personnel_match'`
- Reads the matching cap column from `entitlements`
- Counts rows in `usage_ledger` where `created_at >= date_trunc('month', now())`
- Returns `jsonb`: `{ allowed, used, cap }` or `{ allowed: false, reason }`
- `SECURITY DEFINER`, `search_path = 'public'`

### Edge Function Changes (3 files)

In each function, **after** `businessId` is resolved and **before** the AI gateway call, add the allowance check. If denied, return 429 with `{ error: 'monthly_cap_reached', detail: { used, cap } }`.

**After** the successful AI call, include `usage_remaining` in the response:

| Function | Event type | Response delivery |
|---|---|---|
| `extract-certificate-data` | `'ocr'` | Add `usage_remaining: { used, cap }` to JSON body |
| `suggest-project-personnel` | `'search'` | Add `usage_remaining: { used, cap }` to JSON body |
| `certificate-chat` | `'chat'` | Add `X-Usage-Used` and `X-Usage-Cap` response headers + `Access-Control-Expose-Headers` |

The allowance check is **fail-open**: if the RPC errors, the function continues without blocking.

For `certificate-chat`, the allowance check runs before the AI gateway call. The `used` and `cap` values are captured at that point and set as headers on the SSE response. This means the frontend can read them immediately when the response starts streaming.

### Frontend Changes (3 files)

**`src/components/SmartCertificateUpload.tsx`** (in `processFile`):
- In the catch block, detect 429 responses with `error === 'monthly_cap_reached'` and show a destructive toast with upgrade message
- After success, read `usage_remaining` from the response; if `used/cap >= 0.8`, show amber toast

**`src/components/ChatBot.tsx`** (in `sendAiMessage`, lines ~290-338):
- In the `!response.ok` branch (line 290), parse error JSON; if status is 429 and `error === 'monthly_cap_reached'`, show specific toast instead of generic error
- **Immediately after** `if (!response.ok)` passes (before entering the stream reader loop), read `X-Usage-Used` and `X-Usage-Cap` from `response.headers`; if ratio >= 0.8, show amber toast. This fires when the stream **starts**, not after it completes.

**`src/hooks/useSuggestPersonnel.ts`**:
- In the existing `data.error` handler, add specific check for `'monthly_cap_reached'`
- After success, read `data.usage_remaining`; if ratio >= 0.8, show amber toast

**Amber toast format**: `"You've used X% of your monthly [OCR/Chat/Search] allowance. Upgrade your plan to avoid interruption."`

### Risk Classification
- **RED** — schema migration, SECURITY DEFINER function, edge function changes
- Rollback: `ALTER TABLE DROP COLUMN` for caps, `DROP FUNCTION` for helper, revert edge functions
- Fail-safe: RPC errors do not block AI calls

