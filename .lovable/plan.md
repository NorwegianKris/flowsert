

## Plan: Render All PDF Pages into a Single Stitched Image

**Single file change**: `src/lib/pdfUtils.ts`, replace `pdfToImage()` (lines 7–36).

### Approach

1. Load all pages via `pdf.numPages`
2. Compute a uniform scale based on the widest page (keeping width ≤ 1568px)
3. Render each page to its own temporary canvas
4. Create a combined canvas: width = max page width, height = sum of all page heights
5. Draw each page canvas onto the combined canvas sequentially (stacking vertically)
6. Export as single JPEG at 0.85 quality

The scale calculation changes from "longest side of page 1" to "widest page across all pages", ensuring consistent width. The combined image's height will naturally be tall for multi-page docs — this is fine since Gemini handles tall images well.

Also update the JSDoc comment (line 8) and the `fileToBase64Image` comment (line 84) to reflect "all pages" instead of "first page".

No edge function changes — it still receives one `imageBase64` string.

