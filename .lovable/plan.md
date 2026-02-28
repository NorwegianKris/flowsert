

## Upload Field Redesign — Implementation

**Risk: 🟡 anchor recommended** — changes certificate type assignment logic and validation.

### Confirmed: `stringSimilarity` exists
`src/lib/stringUtils.ts` already exports `stringSimilarity(a, b): number` (0-1 scale, Levenshtein-based). No new file needed.

### File 1: `src/components/CertificateTypeSelector.tsx`

**Full rewrite.** Key changes:

1. **New props:** `ocrHint?: { extractedName: string; confidence: number } | null`, `showFallbackInput?: boolean`
2. **New state:** `showFreeTextInput` (boolean), `ocrAutoApplied` (ref)
3. **Import** `stringSimilarity` from `@/lib/stringUtils`
4. **`useEffect`** on `ocrHint`/`filteredTypes`/`value`:
   - **>=85:** Score all types, auto-select if best > 0.7 AND gap >= 0.15; else pre-fill search
   - **60-84:** Pre-fill `searchValue` with extracted name
   - **<60:** Set flag for hint text render
5. **Enhanced `CommandItem`:** Type name (semibold) + category badge + description
6. **`showFallbackInput` render path:** Dropdown first → "Can't find your certificate type?" link → reveals `Input` + "Back to dropdown" link
7. **Teal "AI suggested" badge** on trigger when OCR auto-selected
8. **Low-confidence hint** below trigger: "AI extracted: [name] — please select the correct type"
9. **Keep** existing `allowFreeText` path for backward compat
10. **Keep** "Show all categories" toggle

### File 2: `src/components/AddCertificateDialog.tsx`

1. **Interface** (~line 46-79): Add `ocrExtractedName?: string; ocrConfidence?: number;` to `CertificateEntry`
2. **Delete lines 577-586:** Remove "Certificate Name *" label + Input entirely
3. **Header display** (line 536): `{cert.certificateTypeName || cert.certificateTypeFreeText || cert.name || 'Unnamed Certificate'}`
4. **`handleExtractionComplete`** (~line 174-220): Add `titleRaw`, `ocrExtractedName`, `ocrConfidence` to `newCert`
5. **Validation** (lines 262-269): Require `certificateTypeId || certificateTypeFreeText` + `dateOfIssue`
6. **`readyCount`** (line 440): Match new validation
7. **`handleSubmit` name derivation** (~line 310): `derivedName = cert.certificateTypeName || cert.certificateTypeFreeText || cert.name || fileName`
8. **`titleRaw` in submit** (~line 291): Fall back to `cert.titleRaw` from OCR
9. **Selector props** (lines 722-745): Replace `allowFreeText` with `showFallbackInput={true}`, add `categoryFilter={cert.categoryId}`, add `ocrHint`

### Post-deployment verification (3.2U.pdf upload)
1. OCR bar shows "Extracted (95%) — Certificate of Proficiency"
2. CertificateTypeSelector either auto-selects with teal "AI suggested" badge (if clear winner) or pre-fills search
3. "Certificate Name *" free text field is gone from dialog

### Not changed
Date fields, expiry, place of issue, issuing authority, file upload, OCR edge function, save logic, multi-file handling, schema, IssuerTypeSelector.

