

## Plan: Add Diagnostic Logging to Smart Upload Flow

The symptoms (both certs show "Manual entry needed", 0 ready to save, edge function returns 200) suggest the data is coming back but either:
- The response shape from `supabase.functions.invoke` doesn't match what the client expects
- Something in post-extraction processing silently produces a `red` status result
- `handleExtractionComplete` in `AddCertificateDialog.tsx` receives data but fails to create a "ready" entry

### Changes

**File 1: `src/components/SmartCertificateUpload.tsx`**

Add `console.log` after the edge function returns (after line 129, before the usage warning check) to dump the raw response:

```typescript
console.log('[SmartUpload] Edge function raw response:', JSON.stringify({ data, error }));
```

Add another `console.log` right before the `return` at line 190 to dump the final processed result:

```typescript
console.log('[SmartUpload] Final extraction result:', JSON.stringify({
  status: data.status,
  confidence: data.confidence,
  fieldsExtracted: data.fieldsExtracted,
  matchedCategoryId,
  matchedIssuerId,
  extractedData: data.extractedData,
}));
```

**File 2: `src/components/AddCertificateDialog.tsx`**

Add `console.log` at the top of `handleExtractionComplete` (after line 186) to dump the full result object:

```typescript
console.log('[AddCertDialog] handleExtractionComplete called:', JSON.stringify({
  status: result.status,
  confidence: result.confidence,
  fieldsExtracted: result.fieldsExtracted,
  extractedData: result.extractedData,
}));
```

These three log points will trace the data from edge function response -> client processing -> parent handler, revealing exactly where the break occurs.

