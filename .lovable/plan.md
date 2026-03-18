

## Analysis: Async Chain Is Correct — Variable Shadowing Is the Real Risk

After reviewing `processFile` (line 33–201), the function **is** marked `async` and all `await` calls are at the correct scope level. The async/await chain is not broken.

However, there is a **variable shadowing issue** on line 171:

```text
Line 113:  const { data, error } = await supabase.functions.invoke(...)   // outer
Line 171:  const { data: newIssuer, error } = await supabase...            // shadows outer `error`
```

The inner `const error` on line 171 shadows the outer `error` from line 113 within the try block. While technically scoped correctly, this is a code smell and could cause subtle issues depending on transpilation.

**More importantly**: if the issue is truly "all fields null, status red, confidence 0" despite a 200 response, the diagnostic logs we just added (`[SmartUpload] Edge function raw response`) will reveal the actual shape mismatch. The async chain itself is not the cause.

### Change

**File: `src/components/SmartCertificateUpload.tsx`** — Rename the shadowed `error` variable on line 171 to `issuerError`, and update its reference on line 181:

```typescript
const { data: newIssuer, error: issuerError } = await supabase
  .from('issuer_types')
  .insert({
    name: data.extractedData.issuingAuthority,
    business_id: businessId,
  })
  .select('id')
  .single();
if (!issuerError) {
  matchedIssuerId = newIssuer?.id || null;
} else {
  console.warn('Auto-create issuer failed:', issuerError.message);
  matchedIssuerId = null;
}
```

This is a single rename — no logic changes. The diagnostic logs already in place will reveal the actual root cause on the next upload attempt.

