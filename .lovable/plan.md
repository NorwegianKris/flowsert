

## Analysis: The Edge Function Is Never Called

The `[SmartUpload] Edge function raw response` log on line 122 **already exists** in the code. If it never appears in the console for `kristian@getflowsert.com`, the function is returning **before** reaching the `supabase.functions.invoke` call on line 113.

The culprit is the **pre-flight OCR allowance check** (lines 35-84). The `supabase.rpc('check_ai_allowance')` call is made with the user's session token, and the `check_ai_allowance` function is `SECURITY DEFINER`. However, the RPC could be failing due to RLS on the `entitlements` or `usage_ledger` tables blocking the non-superadmin user, OR the allowance check is returning `{allowed: false}` for this business.

The `console.error('OCR allowance check failed:', allowanceError)` on line 42 would show in the console if there's an RPC error — but the user says "all fields return null" with no visible error, which means line 56 is likely being hit: `allowance.allowed === false`, silently returning a red result with the "OCR limit reached" message.

### Plan: Add diagnostic logging to the pre-flight check

**File: `src/components/SmartCertificateUpload.tsx`**

Add a `console.log` immediately after the `supabase.rpc('check_ai_allowance')` call (after line 40) to dump the raw allowance response:

```typescript
console.log('[SmartUpload] OCR allowance check result:', JSON.stringify({ allowance, allowanceError }));
```

This single log line will reveal:
- If the RPC returns an error (RLS blocking the call)
- If `allowed` is `false` with `reason: 'monthly_cap_reached'` or `reason: 'no_entitlement_record'`
- If the business has no entitlement record at all

No other changes needed. This will immediately identify whether the block is at the allowance gate or elsewhere.

