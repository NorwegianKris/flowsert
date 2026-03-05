

## Fix Document Preview Scaling — No Horizontal Scroll

### Problem
PDF canvas and images can overflow the dialog width, causing horizontal scrolling. The canvas renders at its native pixel size and images lack width constraints.

### Changes

**1. `src/components/PdfViewer.tsx`**
- Add `max-w-full` and `overflow-x-hidden` to the canvas container div
- Add `max-w-full h-auto` to the canvas element so it scales down to fit the container width

**2. `src/components/DocumentPreviewDialog.tsx`**
- Add `overflow-x-hidden` to the `DialogContent`
- Add `max-w-full` to the image element alongside existing styles
- Add `overflow-x-hidden` to the image scroll container

**3. `src/components/timeline/CertificateViewerDialog.tsx`**
- Same fixes as DocumentPreviewDialog: `overflow-x-hidden` on DialogContent, `max-w-full` on image element, `overflow-x-hidden` on image scroll container

### Files changed
- `src/components/PdfViewer.tsx`
- `src/components/DocumentPreviewDialog.tsx`
- `src/components/timeline/CertificateViewerDialog.tsx`

