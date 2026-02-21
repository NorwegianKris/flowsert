

## Standardize Document Preview: Embedded PdfViewer + Image Controls

**Risk: GREEN** -- UI-only changes, no backend/data/auth modifications.

---

### What Changes

Two files need updating to match the standard set by PersonnelDocuments:

---

### File 1: `src/components/ProjectCertificateStatus.tsx`

This is the most broken component -- currently shows "For security reasons, PDF previews open in a new tab" instead of embedding the viewer.

**Changes:**

1. **Add imports**: `PdfViewer`, `supabase`, `downloadAsBlob`, and icons (`RotateCcw`, `RotateCw`, `ZoomIn`, `ZoomOut`, `Download`)

2. **Add new state variables** (lines 42-44 area):
   - `pdfData: ArrayBuffer | null` -- for PdfViewer
   - `blobUrl: string | null` -- for image display via blob
   - `imgRotation: number` (default 0)
   - `imgZoom: number` (default 1)

3. **Add reset effect**: Reset `imgRotation` and `imgZoom` to defaults when `selectedCertificate.id` changes

4. **Replace the useEffect** (lines 47-56): Instead of just fetching a signed URL, download the file via `supabase.storage.from('certificate-documents').download(path)`:
   - Create blob URL for images
   - Get ArrayBuffer for PDFs to feed into PdfViewer
   - Keep signed URL as fallback for download button
   - Cleanup blob URLs on unmount/change

5. **Add `handleDownloadDocument` helper**: Uses `downloadAsBlob` for direct download, falls back to signed URL

6. **Replace the document preview section** (lines 289-329):
   - **Images**: Add rotation + zoom control bar (RotateCcw, RotateCw, ZoomOut, percentage display, ZoomIn), render image inside scrollable container with `transform: rotate(Xdeg) scale(Y)` style
   - **PDFs**: Replace the "For security reasons" message with embedded `<PdfViewer pdfData={pdfData} />` component (same as PersonnelDocuments)
   - **Header button**: Change from "Open Full Size" to "Download" using the blob download helper

---

### File 2: `src/components/CertificateTable.tsx`

Already has PdfViewer for PDFs but images are displayed as plain static `<img>` tags without controls.

**Changes:**

1. **Add imports** (line 26): Add `RotateCcw`, `RotateCw`, `ZoomIn`, `ZoomOut` icons

2. **Add state variables** (after line 44):
   - `imgRotation: number` (default 0)
   - `imgZoom: number` (default 1)

3. **Add reset effect**: Reset `imgRotation` and `imgZoom` when `selectedCertificate?.id` changes

4. **Replace the image preview** (lines 341-345): Replace the plain `<img>` with the same control bar + scrollable container pattern:
   - Rotation buttons (left/right)
   - Zoom controls (out, percentage, in)
   - Image rendered with `transform: rotate() scale()` CSS
   - Wrapped in scrollable container with border

---

### No files created or deleted. No backend changes.

