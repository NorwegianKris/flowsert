

## Step 7 -- Add Rate Limiting (DB + Edge Functions) ✅ COMPLETED

### What was done

**Part A -- Database Migration**
- Created `rate_limits` table with RLS enabled (no policies — internal only)
- Created `enforce_rate_limit()` SECURITY DEFINER function with privilege lockdown (REVOKE from public, GRANT to authenticated)
- Created `trg_limit_direct_messages()` trigger function (plain invoker, no SECURITY DEFINER)
- Attached BEFORE INSERT trigger on `direct_messages` (30 msg/60s/user)
- Added `window_start` index for cleanup performance

**Part B -- Edge Function Rate Limiting**
- `certificate-chat`: Added rate limit RPC (10 req/60s) after existing JWT validation
- `suggest-project-personnel`: Added JWT validation + rate limit RPC (10 req/60s)
- `extract-certificate-data`: Added JWT validation + rate limit RPC (10 req/60s)
- All use service-role client for RPC (bypasses RLS on rate_limits)

**Part C -- Frontend Error Handling**
- `useDirectMessages.ts`: Detects "rate limit" in error message → friendly toast
- `ChatBot.tsx`: Already handles 429 responses correctly — no changes needed

**Part D -- Cleanup (deferred)**
- Recommend periodic: `DELETE FROM public.rate_limits WHERE window_start < now() - interval '7 days';`
- Automate later with pg_cron
