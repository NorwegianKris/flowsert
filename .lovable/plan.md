

## Unify Document Preview: Create a Shared DocumentPreviewDialog Component

### Problem

Document previews are inconsistent across the system. The "gold standard" is `CertificateViewerDialog` (timeline view) — it has zoom, rotate, download, certificate info header, and proper PDF/image handling. But `IssuerMergingPane` and `TypeMergingPane` use a bare-bones inline dialog with no zoom/rotate for images and no certificate metadata.

### Approach

Extract the document preview UI into a single reusable `DocumentPreviewDialog` component, then replace the inline dialog code in `IssuerMergingPane` and `TypeMergingPane`.

### Changes

**1. Create `src/components/DocumentPreviewDialog.tsx`**

A new shared component that encapsulates all document viewing logic:
- Props: `open`, `onOpenChange`, `documentUrl` (storage path), `title` (e.g. certificate name), optional metadata (personnel name, expiry date, date of issue, place of issue, issuing authority, category)
- Internally handles: blob download from `certificate-documents` bucket, PDF detection + `PdfViewer`, image display with zoom/rotate controls, download button, error/retry state, blob cleanup on close
- When metadata props are provided, shows certificate info header (personnel avatar area, details grid) matching the `CertificateViewerDialog` layout
- When no metadata provided, shows just the document preview with controls (still with zoom/rotate)

**2. Update `IssuerMergingPane.tsx`**

- Remove all inline document viewer state (`documentViewOpen`, `viewingDocument`, `documentBlobUrl`, `pdfData`, `loadingDocument`) and the `handleViewDocument` callback
- Remove the inline `<Dialog>` block (lines ~957-1005)
- Replace with `<DocumentPreviewDialog>` passing `documentUrl`, `title` (file name), and any available cert metadata (personnel name, expiry from the cert object)
- Update `handleViewDocument` to just set the selected cert data for the dialog

**3. Update `TypeMergingPane.tsx`**

- Same refactor as IssuerMergingPane — remove inline dialog, replace with `<DocumentPreviewDialog>`

**4. No changes to existing components that already work well**

- `CertificateViewerDialog` — keep as-is (it has timeline-specific event data)
- `ProjectCertificateStatus` — already has zoom/rotate, keep as-is
- `PersonnelDocuments` / `ProjectDocuments` — already use `PdfViewer`, keep as-is

### Files changed
- `src/components/DocumentPreviewDialog.tsx` — new shared component
- `src/components/IssuerMergingPane.tsx` — replace inline dialog with shared component
- `src/components/TypeMergingPane.tsx` — replace inline dialog with shared component

