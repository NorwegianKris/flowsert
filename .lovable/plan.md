

## Plan: Add Fuzzy Dedup Before Auto-Creating Issuers

**Single file change**: `src/components/SmartCertificateUpload.tsx`, lines 149–156.

Replace the current matched issuer block with:

1. Keep the exact case-insensitive match as the first check
2. If no exact match, run a fuzzy dedup check (strip non-alphanumeric, compare with includes)
3. If fuzzy match found, use that issuer's ID
4. If no fuzzy match and `businessId` is present, auto-create via `issuer_types` insert

```typescript
// Find matched issuer ID if there's a match
let matchedIssuerId: string | null = null;
if (data.extractedData?.matchedIssuer && existingIssuers) {
  const matched = existingIssuers.find(
    i => i.name.toLowerCase() === data.extractedData.matchedIssuer.toLowerCase()
  );
  if (matched) {
    matchedIssuerId = matched.id;
  } else if (businessId && data.extractedData.issuingAuthority) {
    // Fuzzy dedup — prevent near-duplicate issuers
    const fuzzyMatch = existingIssuers.find(i => {
      const a = i.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const b = data.extractedData.issuingAuthority.toLowerCase().replace(/[^a-z0-9]/g, '');
      return a === b || a.includes(b) || b.includes(a);
    });
    if (fuzzyMatch) {
      matchedIssuerId = fuzzyMatch.id;
    } else {
      // genuinely new — auto-create
      const { data: newIssuer } = await supabase
        .from('issuer_types')
        .insert({
          name: data.extractedData.issuingAuthority,
          business_id: businessId,
        })
        .select('id')
        .single();
      matchedIssuerId = newIssuer?.id || null;
    }
  }
}
```

No other changes.

