

## Step 7 -- Add Rate Limiting (DB + Edge Functions)

### Overview

Add multi-layered rate limiting: a database trigger for direct message spam prevention and RPC-based rate limiting in the three AI edge functions. Includes privilege lockdown, frontend error handling improvements, and a cleanup index.

---

### Part A -- Database Migration

A single migration creates the rate limiting infrastructure:

**1. `rate_limits` table** with RLS enabled (no client policies), plus a `window_start` index for cleanup performance.

**2. `enforce_rate_limit()` function** -- `SECURITY DEFINER`, fixed-window counter. After creation, execute privileges are revoked from `public` and granted only to `authenticated`.

**3. `trg_limit_direct_messages()` function** -- plain invoker (no `SECURITY DEFINER`), calls `enforce_rate_limit` with key `direct_messages:<user_id>`, limit 30, window 60s.

**4. Trigger** on `direct_messages` -- BEFORE INSERT, FOR EACH ROW.

```text
Migration SQL summary:

CREATE TABLE public.rate_limits (key, window_start, count)
  + RLS enabled, no policies
  + INDEX on window_start

CREATE FUNCTION public.enforce_rate_limit(p_key, p_limit, p_window_seconds)
  SECURITY DEFINER, SET search_path TO 'public'
  REVOKE ALL FROM public
  GRANT EXECUTE TO authenticated

CREATE FUNCTION public.trg_limit_direct_messages()
  plain invoker (no SECURITY DEFINER)
  calls enforce_rate_limit('direct_messages:' || auth.uid(), 30, 60)

CREATE TRIGGER limit_direct_messages
  BEFORE INSERT ON direct_messages FOR EACH ROW
```

---

### Part B -- Edge Function Changes

All three AI edge functions get JWT validation (where missing) and a rate limit RPC call before the AI gateway request.

**`certificate-chat/index.ts`** -- already has JWT validation via `getClaims`. Add rate limit RPC call using a service-role client:
- Key: `ai_chat:<userId>`, limit 10, window 60s
- If RPC error contains "rate limit" -> return 429

**`suggest-project-personnel/index.ts`** -- currently has NO auth validation. Add:
- Auth header extraction + `getClaims` validation
- Rate limit RPC: key `ai_suggest:<userId>`, limit 10, window 60s

**`extract-certificate-data/index.ts`** -- currently has NO auth validation. Add:
- Auth header extraction + `getClaims` validation
- Rate limit RPC: key `ai_extract:<userId>`, limit 10, window 60s

Each function creates a service-role Supabase client for the RPC call (so it bypasses RLS on the `rate_limits` table).

---

### Part C -- Frontend Error Handling

**`src/hooks/useDirectMessages.ts`** -- Update `handleSend` to detect "rate limit exceeded" in the database error message and show a specific toast: "You're sending messages too fast. Please wait a moment." instead of the generic "Failed to send message".

**`src/components/ChatBot.tsx`** -- Already handles non-ok responses and displays `errorData.error` via toast. A 429 response with `{ error: "Rate limit exceeded..." }` will surface correctly. No changes needed.

---

### Part D -- Cleanup Note

Recommend periodic cleanup of old `rate_limits` rows (deferred, manual for now):

```text
DELETE FROM public.rate_limits WHERE window_start < now() - interval '7 days';
```

Can be automated later with pg_cron.

---

### Files Changed

- New migration SQL file (rate_limits table, functions, trigger, privilege grants)
- `supabase/functions/certificate-chat/index.ts` -- add rate limit RPC block
- `supabase/functions/suggest-project-personnel/index.ts` -- add JWT validation + rate limit RPC
- `supabase/functions/extract-certificate-data/index.ts` -- add JWT validation + rate limit RPC
- `src/hooks/useDirectMessages.ts` -- improve error toast for rate limit

### Risk

Low. Rate limits are generous (30 msg/min, 10 AI/min). The `rate_limits` table has no client-facing policies. The trigger function uses invoker privileges (least privilege). All existing functionality preserved.

