

## OCR Expiry Date Guard — Implementation Plan

### Changes (3 edits, 1 file)

**File:** `supabase/functions/extract-certificate-data/index.ts`

**A. Post-extraction date guard** — Insert after line 396 (after `extractedData` is built), before the `coreFields` block:

```ts
// Guard: discard expiry if it matches issue date (single-date misread)
if (extractedData.expiryDate && extractedData.dateOfIssue 
    && extractedData.expiryDate === extractedData.dateOfIssue) {
  extractedData.expiryDate = null;
  issues.push("Only one date detected — expiry date cleared to avoid misread");
}
// Guard: discard expiry if it's before issue date
if (extractedData.expiryDate && extractedData.dateOfIssue 
    && extractedData.expiryDate < extractedData.dateOfIssue) {
  extractedData.expiryDate = null;
  issues.push("Expiry date appears before issue date — cleared");
}
```

Note: `issues` is declared on line 408 — need to move the guard after line 408 or declare issues earlier. Since `issues` is initialized on line 408, the guard block should go after line 408 (after `const issues: string[] = [];`).

**B. Strengthen AI prompt** — Line 274, update the `expiryDate` description:
```
"Only return an expiry date if a SEPARATE, DISTINCT date is visible on the document that is clearly labelled or contextually identifiable as an expiry/validity date. If only one date exists on the document, return null. Format: YYYY-MM-DD."
```

**C. No other changes.**

### Risk
🔴 Edge function logic — anchor required per project protocol.

