

# Auto-Match Extracted Issuers to Canonical Issuer Types

## What This Does
When a certificate is scanned using AI, the system will now also try to match the recognized issuing authority against your list of canonical issuers. If a match is found, the issuer field will be pre-filled automatically, saving time and improving data consistency.

## Why It's Safe
- Mirrors the existing category matching pattern that already works
- If no match is found, the field simply stays as free text (current behavior)
- Users can always override the auto-selected issuer
- No database changes needed

## Changes (4 files)

### 1. Types Update (`src/types/certificateExtraction.ts`)
- Add `matchedIssuer: string | null` and `matchedIssuerId: string | null` to `ExtractedCertificateData`

### 2. Upload Props (`src/components/certificate-upload/types.ts`)
- Add optional `existingIssuers` prop (array of `{ id, name }`) to `SmartCertificateUploadProps`

### 3. Upload Component (`src/components/SmartCertificateUpload.tsx`)
- Accept `existingIssuers` prop
- Pass issuer names to the edge function alongside categories
- After extraction, resolve the matched issuer name to an ID (same logic as category matching)

### 4. Edge Function (`supabase/functions/extract-certificate-data/index.ts`)
- Accept optional `existingIssuers` array in the request body
- Add issuer list to the AI system prompt (same pattern as categories)
- Add `matchedIssuer` field to the AI tool schema
- Include the matched issuer in the response

### 5. Certificate Dialog (`src/components/AddCertificateDialog.tsx`)
- Fetch issuer types using the existing `useIssuerTypes` hook
- Pass them to `SmartCertificateUpload` as `existingIssuers`
- In `handleExtractionComplete`, auto-set `issuerTypeId` and `issuerTypeName` when a match is returned
- Mark `issuerAliasAutoMatched: true` for visual indication

## Technical Details

### Edge function prompt addition
```
Known issuing authorities in this system: DNV, Falck Safety Services, Red Cross, ...
If the issuing authority matches one of these exactly or closely, include that name in matchedIssuer.
```

### Data flow
1. Fetch issuer types from `issuer_types` table (existing `useIssuerTypes` hook)
2. Pass names array to edge function
3. AI returns `matchedIssuer` string if confident
4. Frontend resolves string to ID, pre-selects in `IssuerTypeSelector`
5. User can override if needed

### Graceful fallback
- If `existingIssuers` is not passed or empty, the prompt section is simply omitted (no change in behavior)
- If AI doesn't find a match, `matchedIssuer` returns null (current behavior preserved)
- No error paths are introduced
