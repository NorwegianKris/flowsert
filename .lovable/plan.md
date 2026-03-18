

## Plan: Add placeOfIssue Post-Processing Guard

**Single insertion** in `supabase/functions/extract-certificate-data/index.ts`, after line 431 (the expiry-before-issue guard), before line 432 (`let confidence`).

Insert the provided guard block that checks `extractedData.placeOfIssue` against organization name indicators (`centre`, `authority`, `training`, `Ltd`, etc.). If a match is found, it moves the value to `issuingAuthority` (if empty) and clears `placeOfIssue`.

```text
Line 431:   issues.push("Expiry date appears before issue date — cleared");
Line 432: }
           ← INSERT GUARD HERE
Line 433: let confidence = extractedRaw.confidence || 0;
```

No other changes.

