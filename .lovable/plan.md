

## Fix 1 & Fix 2 — OCR Type Suggestion + Auto-Geocode

**Risk: 🔴 anchor required** — changes edge function prompt/schema and OCR data flow.

### Fix 1: Extend OCR to return `suggestedTypeName` + `classificationConfidence`

**File: `supabase/functions/extract-certificate-data/index.ts`**

1. **ExtractedData interface** (lines 16-24): Add `suggestedTypeName: string | null` and `classificationConfidence: number`
2. **System prompt** (lines 192-210): Add instruction paragraph telling the AI to also classify the certificate into its canonical industry type name (e.g. "BOSIET with CA-EBS", "CSWIP 3.2U Diver Inspector"), using all signals: title, issuer, logos, expiry period, qualification level. Return null if genuinely uncertain.
3. **Tool schema** (lines 248-293): Add two properties:
   - `suggestedTypeName` — string, nullable, description: "The canonical industry-standard certificate type name"
   - `classificationConfidence` — number, description: "0-100 confidence in suggestedTypeName"
4. **Response building** (lines 364-372): Add `suggestedTypeName: extractedRaw.suggestedTypeName || null` and `classificationConfidence: extractedRaw.classificationConfidence || 0` to `extractedData`
5. **Error response** (lines 450-458): Add `suggestedTypeName: null` and `classificationConfidence: 0` to error fallback

**File: `src/types/certificateExtraction.ts`**

6. **ExtractedCertificateData interface** (lines 5-15): Add `suggestedTypeName: string | null` and `classificationConfidence: number`

**File: `src/components/SmartCertificateUpload.tsx`**

7. **processFile return** (lines 102-109): Pass through `suggestedTypeName` and `classificationConfidence` from `data.extractedData` (already handled by spread `...data.extractedData`)
8. **Error fallback** (lines 38-49): Add `suggestedTypeName: null` and `classificationConfidence: 0`

**File: `src/components/AddCertificateDialog.tsx`**

9. **handleExtractionComplete** (lines 207-209): Change ocrHint source from `certificateName` to `suggestedTypeName`, and from `result.confidence` to `classificationConfidence`:
   ```typescript
   ocrExtractedName: extractedData.suggestedTypeName || extractedData.certificateName || '',
   ocrConfidence: extractedData.classificationConfidence || result.confidence,
   ```
   Keep `titleRaw: extractedData.certificateName || fileName` unchanged.

### Fix 2: Auto-geocode extracted place of issue

**File: `src/components/AddCertificateDialog.tsx`**

10. **handleExtractionComplete** (after line 220): When `placeOfIssue` is a non-empty string, fire a non-blocking Nominatim geocoding call:
    ```typescript
    if (extractedData.placeOfIssue) {
      fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(extractedData.placeOfIssue)}&format=json&limit=1`, {
        headers: { 'User-Agent': 'FlowSert/1.0' }
      })
        .then(r => r.json())
        .then(results => {
          if (results?.[0]?.display_name) {
            setCertificates(prev => prev.map(c =>
              c.id === newCert.id
                ? { ...c, placeOfIssue: results[0].display_name }
                : c
            ));
          }
        })
        .catch(() => { /* keep plain text fallback */ });
    }
    ```
    This is fire-and-forget — if geocoding fails, the plain text from OCR is kept. No new dependencies. Nominatim is free, no API key, already used by the Photon API in `useGeoSearch`.

### Files changed
- `supabase/functions/extract-certificate-data/index.ts` — prompt + schema + response
- `src/types/certificateExtraction.ts` — 2 new fields on interface
- `src/components/SmartCertificateUpload.tsx` — error fallback fields
- `src/components/AddCertificateDialog.tsx` — ocrHint source + geocoding

### Not changed
- CertificateTypeSelector (fuzzy matching logic unchanged — it just receives better input)
- Save logic, validation, schema, other edge functions

