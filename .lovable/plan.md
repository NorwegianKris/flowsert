

## FlowSert — Full QA Checklist Results (Section 3: Certificate Upload Pipeline)

### Admin Upload

**3.1 Upload single certificate PDF — file stored, OCR runs, title extracted**
**Status: PASS (code review)**
- `SmartCertificateUpload` accepts PDFs via `accept=".pdf,.jpg,.jpeg,.png,.webp,.gif"`
- `fileToBase64Image()` in `pdfUtils.ts` converts PDF first page to JPEG at 1568px optimal scale with quality 0.85
- Edge function `extract-certificate-data` is invoked via `supabase.functions.invoke()`
- On success, `handleExtractionComplete` creates a `CertificateEntry` with extracted title, dates, issuer, and place
- File is stored to `certificate-documents` bucket at path `{certificateId}/{timestamp}.{ext}` — relative path stored in `document_url`

**3.2 Upload single certificate image (JPG/PNG) — file stored, OCR runs, title extracted**
**Status: PASS (code review)**
- Images pass through `imageToBase64()` which resizes to 1568px max and outputs JPEG at 0.85 quality
- Same extraction pipeline as PDF — edge function returns structured OCR data
- `getFileTypeStatus()` correctly classifies JPEG/PNG/WebP/GIF as `'supported'`

**3.3 Upload multiple certificates in batch — all processed**
**Status: PASS (code review)**
- `UploadZone` has `multiple` attribute on file input
- `SmartCertificateUpload.processQueue()` iterates pending items sequentially with 500ms delay between calls
- Each file gets its own queue entry with independent status tracking (pending → processing → complete/error)
- Max 10 files enforced via `maxFiles` prop

**3.4 Mobile camera capture works (verify capture="environment" on upload input)**
**Status: PASS (code review)**
- Both file inputs in `UploadZone` (compact and full modes, lines 60 and 92) include `capture="environment"`
- This enables rear camera capture on mobile devices

**3.5 Uploaded file stores relative filePath (not getPublicUrl() output)**
**Status: PASS (code review)**
- `AddCertificateDialog` line 392: `const filePath = \`\${insertedCert.id}/\${Date.now()}.\${fileExt}\``
- Line 406: `update({ document_url: filePath })` — stores the relative path directly
- No call to `getPublicUrl()` anywhere in the upload flow

**3.6 OCR result populates certificate title field**
**Status: PASS (code review)**
- `handleExtractionComplete` sets `titleRaw: extractedData.certificateName || fileName`
- `ocrExtractedName: extractedData.suggestedTypeName || extractedData.certificateName || ''`
- The OCR-extracted name is passed to `CertificateTypeSelector` as `ocrHint`

**3.7 Fuzzy matching runs against existing certificate_types and certificate_aliases**
**Status: PASS (code review)**
- `CertificateTypeSelector` OCR auto-match logic (line 101-168):
  1. First attempts alias lookup in `certificate_aliases` table by normalized name
  2. Falls back to fuzzy matching via `stringSimilarity()` against all certificate types

**3.8 Auto-match at high threshold assigns certificate_type_id and category_id**
**Status: PASS (code review)**
- Auto-selection threshold: confidence >= 85 AND fuzzy score > 0.7 AND clear winner (gap >= 0.15)
- When matched, `onChange(best.id, best.name)` is called and teal "AI suggested" badge shown
- Category is inherited from the matched type's `category_id` at submit time

**3.9 Below threshold: certificate remains unmapped, appears in triage queue**
**Status: PASS (code review)**
- Confidence < 60: only shows hint text, no auto-selection
- Confidence 60-84 or no clear winner: pre-fills search field only
- Unmapped certificates (where `certificate_type_id IS NULL AND unmapped_by IS NULL AND title_raw IS NOT NULL`) appear in `CertificateReviewQueue`

**3.10 Upload with no OCR-extractable text — fails gracefully, certificate still saved**
**Status: PASS (code review)**
- Unsupported file types return a red status result with `fieldsExtracted: 0` and descriptive issue message
- The certificate entry is still created with filename as `name` and empty fields
- Submit only requires certificate type (dropdown or free text) and date of issue — OCR failure doesn't block saving
- Edge function errors are caught and set `status: 'error'` on the queue item without crashing the batch

---

### Worker/Freelancer Upload

**3.11 Worker can upload own certificates**
**Status: PASS (code + RLS review)**
- RLS policy "Workers can insert their own certificates" allows INSERT where `personnel.user_id = auth.uid()`
- Storage policy "Secure upload to certificate documents" allows uploads scoped to the worker's certificate
- `AddCertificateDialog` is rendered in `WorkerDashboard` for the worker's own `personnelId`

**3.12 Freelancer can upload own certificates**
**Status: PASS (code + RLS review)**
- Freelancers have `role = 'worker'` in `user_roles`, so the same worker RLS policies apply
- No freelancer-specific upload blocking exists (the "Block freelancer" policy only applies to SELECT/download, not INSERT)

**3.13 Uploaded certificates appear in their profile**
**Status: PASS (code review)**
- After insert, `onSuccess()` callback triggers data refetch in the parent component
- Worker dashboard's certificate list uses `usePersonnel` which fetches certificates via `can_access_personnel()`

**3.14 Worker/freelancer cannot upload certificates for other personnel**
**Status: PASS (RLS review)**
- Worker INSERT policy: `has_role(auth.uid(), 'worker') AND EXISTS (SELECT 1 FROM personnel p WHERE p.id = certificates.personnel_id AND p.user_id = auth.uid())`
- This ensures workers can only insert certificates for their own personnel record
- The UI only provides the worker's own `personnelId` — no personnel selector is shown for workers

**3.15 Mobile camera capture works for worker/freelancer roles**
**Status: PASS (code review)**
- Same `UploadZone` component with `capture="environment"` is used regardless of role
- No role-based conditional logic on the upload input

---

### Storage

**3.16 Signed URLs generated correctly for private storage**
**Status: PASS (code review)**
- `getCertificateDocumentUrl()` in `storageUtils.ts` extracts the relative path and calls `getSignedUrl('certificate-documents', path)`
- `getSignedUrl()` uses `supabase.storage.from(bucket).createSignedUrl(filePath, 3600)` — 1-hour expiry
- `CertificateThumbnail` component calls `getCertificateDocumentUrl()` to get signed URLs for display

**3.17 storageUtils.ts returns null on signed URL failure (no fallback to public URL)**
**Status: PASS (code review)**
- `getSignedUrl()` returns `null` on error (line 37 in storageUtils.ts)
- No `getPublicUrl()` call exists anywhere in the function
- `downloadAsBlob()` also returns `null` on failure

**3.18 Document thumbnails display at 40px in triage queue rows**
**Status: PASS (code review)**
- `CertificateReviewQueue` line 479: `<CertificateThumbnail documentUrl={group.sample_document_url} size={40} />`
- The `CertificateThumbnail` component applies `style={{ width: size, height: size }}` with `object-cover` class

**3.19 Document thumbnails display at 120px in expanded triage view**
**Status: PASS (code review)**
- `CertificateReviewQueue` line 553: `<CertificateThumbnail documentUrl={group.sample_document_url} size={120} />`
- Rendered inside the `CollapsibleContent` expanded row under "Document Preview" heading

**3.20 Thumbnail for missing/broken document_url shows graceful fallback (not broken image)**
**Status: PASS (code review)**
- `CertificateThumbnail` handles three fallback cases:
  1. `documentUrl === null`: renders grey `ImageOff` icon in muted background (line 82-90)
  2. PDF files: renders `FileText` icon instead of attempting image render (line 92-103)
  3. Image load error (`onError`): sets `imgError = true`, switches to `FileText` icon (line 114-125, 134)
- No broken `<img>` tag is ever shown — all failure paths render icon placeholders

---

### Summary

| Check | Result |
|---|---|
| 3.1 PDF upload + OCR | PASS |
| 3.2 Image upload + OCR | PASS |
| 3.3 Batch upload | PASS (sequential, 500ms delay) |
| 3.4 Mobile camera capture | PASS (capture="environment") |
| 3.5 Relative filePath stored | PASS |
| 3.6 OCR populates title | PASS |
| 3.7 Fuzzy matching | PASS (alias lookup + stringSimilarity) |
| 3.8 Auto-match threshold | PASS (≥85 confidence + 0.7 score + 0.15 gap) |
| 3.9 Below threshold → triage | PASS |
| 3.10 No OCR text → graceful | PASS |
| 3.11 Worker upload | PASS |
| 3.12 Freelancer upload | PASS |
| 3.13 Certificates appear in profile | PASS |
| 3.14 Cross-personnel blocked | PASS (RLS enforced) |
| 3.15 Mobile capture for workers | PASS |
| 3.16 Signed URLs | PASS (1hr expiry) |
| 3.17 No public URL fallback | PASS |
| 3.18 40px thumbnails | PASS |
| 3.19 120px thumbnails | PASS |
| 3.20 Missing doc fallback | PASS (ImageOff / FileText icons) |

**All 20 checks pass. No issues found in Section 3.**

