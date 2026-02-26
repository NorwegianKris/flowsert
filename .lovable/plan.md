

## Plan: Optimize image sizing in pdfUtils.ts

Single file: `src/lib/pdfUtils.ts`

### Change 1 — Replace `pdfToImage` body (lines 13–38)
- Calculate optimal scale based on page dimensions, capping longest side at 1568px
- Lower JPEG quality from 0.9 to 0.85

### Change 2 — Replace `imageToBase64` function (lines 41–55)
- Load image via `new Image()` + `createObjectURL`
- Downscale if longest side > 1568px
- Render to canvas and export as JPEG 0.85
- Note: user message was truncated at `img.o` — will complete with standard `img.onerror` handler

### Risk
- 🟢 Purely client-side utility, no backend/auth/RLS changes

