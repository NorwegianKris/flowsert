

## Plan: Fix Issuer Auto-Create for All Businesses

### Problem
The issuer matching block (line 166) is gated by `data.extractedData?.matchedIssuer && existingIssuers`. For new businesses with an empty issuers list, the AI returns `matchedIssuer: null` even when `issuingAuthority` is populated. The entire auto-create block is skipped.

### Fix
**File: `src/components/SmartCertificateUpload.tsx`** (lines 164-203)

Replace the issuer matching block so it triggers on `issuingAuthority` instead of `matchedIssuer`:

1. First check for an exact match via `matchedIssuer` (existing behavior, still useful when the AI does match)
2. If no exact match, check `issuingAuthority` + `businessId` — run fuzzy dedup against `existingIssuers`, and auto-create if no duplicate found
3. This ensures the block runs even when `existingIssuers` is empty (the fuzzy check simply finds no match → auto-creates)

```typescript
let matchedIssuerId: string | null = null;

// Try exact AI match first
if (data.extractedData?.matchedIssuer && existingIssuers) {
  const matched = existingIssuers.find(
    i => i.name.toLowerCase() === data.extractedData.matchedIssuer.toLowerCase()
  );
  if (matched) matchedIssuerId = matched.id;
}

// If no exact match, try fuzzy dedup or auto-create based on issuingAuthority
if (!matchedIssuerId && data.extractedData?.issuingAuthority && businessId) {
  const extractedName = data.extractedData.issuingAuthority.trim();
  const fuzzyMatch = existingIssuers?.find(i => {
    const a = i.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const b = extractedName.toLowerCase().replace(/[^a-z0-9]/g, '');
    return a === b || a.includes(b) || b.includes(a);
  });
  if (fuzzyMatch) {
    matchedIssuerId = fuzzyMatch.id;
  } else {
    // auto-create new issuer
    try { ... } catch { ... }
  }
}
```

Single file change, no database or edge function modifications needed.

