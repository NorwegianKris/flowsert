

## Plan: Add error logging + fix data path bug in TaxonomySeedingTool

### Root cause found

Comparing SmartCertificateUpload vs TaxonomySeedingTool, the edge function response structure is:
```json
{ "extractedData": { "suggestedTypeName": "CSWIP 3.2U...", "certificateName": "Certificate of Proficiency" }, ... }
```

**TaxonomySeedingTool line 108** reads `data?.suggestedTypeName` — this is `undefined` because the field is nested inside `data.extractedData`.

SmartCertificateUpload correctly accesses `data.extractedData.suggestedTypeName` (line 49 in its result mapping).

So the OCR succeeds, but the code can't find the extracted name, hits the "Could not extract certificate name" branch (line 109-113), and shows an error.

### Changes in `src/components/TaxonomySeedingTool.tsx`

1. **Line 108** — Fix the data path:
   - `data?.suggestedTypeName` → `data?.extractedData?.suggestedTypeName`
   - `data?.certificateName` → `data?.extractedData?.certificateName`

2. **Line 145** — Fix the category path:
   - `data?.suggestedCategory` → `data?.extractedData?.matchedCategory`

3. **Lines 173-177** — Enhance error logging in the catch block to log the file name and full error object.

4. **Lines 320-349** — Update the file list UI: when status is `'error'`, show the `errorMessage` below the filename in small red/muted text.

### Files touched
- **Edit:** `src/components/TaxonomySeedingTool.tsx`

