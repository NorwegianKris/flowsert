

## Plan: Fix Word-Boundary Check for Short Org Indicators

**Problem**: The current guard uses `.includes()` for all indicators. Short ones like `"AS"` (lowercased to `"as"`) will match substrings in place names like "Haugesund", "Newcastle", etc., causing false positives.

**Fix**: Replace the simple `.includes()` check with a word-boundary regex (`\b`) for each indicator. This ensures `"AS"` only matches as a standalone word, not as a substring.

**Single change** in `supabase/functions/extract-certificate-data/index.ts`, lines 442-444.

Replace:
```typescript
const looksLikeOrg = orgIndicators.some(indicator =>
  place.includes(indicator.toLowerCase())
);
```

With:
```typescript
const looksLikeOrg = orgIndicators.some(indicator => {
  const pattern = new RegExp(`\\b${indicator}\\b`, 'i');
  return pattern.test(extractedData.placeOfIssue!);
});
```

This uses case-insensitive word-boundary matching on the original (non-lowercased) string, so `"AS"` matches `"Falck AS"` but not `"Haugesund"`. The `place` lowercase variable becomes unused and can be removed (line 441).

One change only. Nothing else touched.

