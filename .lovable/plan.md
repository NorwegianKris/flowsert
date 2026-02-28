

## Add Temporary Debug Logs — Edge Function + Frontend

**Risk: 🟢 anchor optional** — temporary console.log only, no logic changes.

### File 1: `supabase/functions/extract-certificate-data/index.ts`

**Line 451 (after `logUsage` block, before `return new Response`):** Insert:
```typescript
console.log('EXTRACTION_RESULT:', JSON.stringify({
  certificateName: extractedData.certificateName,
  suggestedTypeName: extractedData.suggestedTypeName,
  classificationConfidence: extractedData.classificationConfidence,
  confidence: result.confidence
}));
```

### File 2: `src/components/AddCertificateDialog.tsx`

**Line 178 (immediately after `const { extractedData } = result;`):** Insert:
```typescript
console.log('FRONTEND_OCR:', JSON.stringify({
  certificateName: extractedData?.certificateName,
  suggestedTypeName: extractedData?.suggestedTypeName,
  classificationConfidence: extractedData?.classificationConfidence,
  ocrHintPassed: extractedData?.suggestedTypeName ? {
    extractedName: extractedData.suggestedTypeName,
    confidence: extractedData.classificationConfidence
  } : null
}));
```

### After deploy
1. Re-upload 3.2U.pdf
2. Check edge function logs for `EXTRACTION_RESULT`
3. Check browser console for `FRONTEND_OCR`
4. Return both raw outputs

### Files changed
- `supabase/functions/extract-certificate-data/index.ts` — 1 console.log
- `src/components/AddCertificateDialog.tsx` — 1 console.log

