

## Fix Logo Compression in PDF Export

**Risk: GREEN** -- Purely visual fix to client-side PDF rendering. No database, auth, or backend changes.

---

### Problem

The `drawPdfLogo` function in `src/lib/pdfLogoUtils.ts` hardcodes both width (40mm) and height (12mm), assuming a 3.33:1 aspect ratio. If the actual logo has a different ratio, it renders horizontally compressed.

### Solution

Measure the logo's true pixel dimensions at load time, then calculate the correct width from a fixed max height (12mm). This preserves the original aspect ratio regardless of the source image dimensions.

### File Changed

**`src/lib/pdfLogoUtils.ts`** -- single file, no other changes needed since all PDF generators already call `drawPdfLogo`.

### Technical Details

1. In `loadPdfLogo()`, after converting the image to base64, load it into an `Image` element to read its `naturalWidth` and `naturalHeight`
2. Cache the aspect ratio alongside the base64 string
3. Export `PDF_LOGO_HEIGHT = 12` (fixed) but compute `PDF_LOGO_WIDTH` dynamically as `height * aspectRatio`
4. Update `drawPdfLogo` to use the computed width

The function signature of `drawPdfLogo(doc, logoBase64, margin)` stays the same -- callers in `competenceMatrixPdf.ts`, `mergeCertificatesPdf.ts`, `ShareProjectDialog.tsx`, and `ExternalSharingDialog.tsx` require zero changes.

### Acceptance Criteria

- Logo proportions match the original PNG file exactly
- No horizontal or vertical distortion
- Header spacing and alignment unchanged
- No regression in any of the four PDF export types

