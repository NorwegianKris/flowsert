

## Plan: Document Thumbnails in the Triage Queue

### Overview
Add thumbnail previews to the CertificateReviewQueue table. This requires two changes: extending the data hook to fetch `document_url`, and updating the component to render thumbnails.

### Edit: `src/hooks/useCertificatesNeedingReview.ts`

1. Add `document_url` to the SELECT query (line 41-52) alongside the existing fields
2. Add `document_url` to the `UnmappedCertificate` interface
3. In the grouping logic, collect the first `document_url` found per group into a new field `sample_document_url` on `ReviewGroup`
4. Update the `ReviewGroup` interface to include `sample_document_url: string | null`

### Edit: `src/components/CertificateReviewQueue.tsx`

**Table header (line 344-358):**
- Insert a new `<TableHead>` for thumbnails as the FIRST column (before checkbox), width ~50px

**Table rows (line 367-435):**
- Insert a new `<TableCell>` as the first cell containing a thumbnail:
  - If `document_url` ends with `.pdf` → show a `FileText` icon (lucide) styled as a 40x40 placeholder
  - If image extension (jpg/jpeg/png/webp/gif) or no extension → render an `<img>` tag at 40x40 with `object-cover`, rounded corners
  - On click → open the full document URL via `getCertificateDocumentUrl()` from `storageUtils.ts` in a new tab
  - On image error → fall back to a grey `FileText` icon placeholder
  - If `document_url` is null → show grey `ImageOff` icon placeholder

**Expanded row (line 436-504):**
- In the expanded content area, add a "Document Preview" section showing a larger thumbnail (~120px wide) using the same logic
- Update `colSpan` from 7 to 8 to account for the new column

**Imports:**
- Add `ImageOff` from lucide-react
- Import `getCertificateDocumentUrl` from `@/lib/storageUtils`

### Technical details
- Signed URLs are needed since the `certificate-documents` bucket is private; use `getCertificateDocumentUrl()` which handles path extraction and signed URL generation
- The thumbnail `<img>` uses the signed URL; since these are loaded lazily per-row, no batch pre-fetching is needed — a simple `useState` + `useEffect` per thumbnail suffices, or a small inline component
- To keep things clean, create a small `CertificateThumbnail` sub-component inside the file that handles: signed URL fetching on mount, loading state, error fallback, and click-to-open
- No database changes, no schema changes, no new tables

### Files touched
- **Edit:** `src/hooks/useCertificatesNeedingReview.ts` (add `document_url` to query + grouping)
- **Edit:** `src/components/CertificateReviewQueue.tsx` (add thumbnail column + expanded preview)

