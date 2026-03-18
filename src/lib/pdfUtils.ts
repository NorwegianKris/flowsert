import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Configure PDF.js worker using Vite's URL import (avoids CDN issues)
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

/**
 * Convert all pages of a PDF to a single vertically-stitched base64 JPEG image.
 * @param file - The PDF file to convert
 * @param scale - Scale factor for rendering (higher = better quality but larger size)
 * @returns Base64 encoded image data (without data URI prefix)
 */
export async function pdfToImage(file: File, scale: number = 2.0): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const numPages = pdf.numPages;

  // First pass: determine the widest page at scale 1.0 to compute a uniform scale
  let maxBaseWidth = 0;
  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const vp = page.getViewport({ scale: 1.0 });
    if (vp.width > maxBaseWidth) maxBaseWidth = vp.width;
  }

  // Keep the widest page ≤ 1568px (Gemini optimal)
  const optimalScale = Math.min(scale, 1568 / maxBaseWidth);

  // Second pass: render each page and collect canvases
  const pageCanvases: HTMLCanvasElement[] = [];
  let totalHeight = 0;
  let combinedWidth = 0;

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: optimalScale });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    await page.render({ canvasContext: ctx, viewport }).promise;

    pageCanvases.push(canvas);
    totalHeight += viewport.height;
    if (viewport.width > combinedWidth) combinedWidth = viewport.width;
  }

  // Stitch all pages vertically into one canvas
  const combined = document.createElement('canvas');
  combined.width = combinedWidth;
  combined.height = totalHeight;

  const combCtx = combined.getContext('2d');
  if (!combCtx) throw new Error('Could not get canvas context');

  let yOffset = 0;
  for (const pc of pageCanvases) {
    combCtx.drawImage(pc, 0, yOffset);
    yOffset += pc.height;
  }

  // JPEG at quality 0.85 — sufficient for OCR, meaningfully smaller than 0.9
  const dataUrl = combined.toDataURL('image/jpeg', 0.85);
  return dataUrl.replace(/^data:image\/jpeg;base64,/, '');
}

/**
 * Convert an image file to base64
 * @param file - The image file to convert
 * @returns Base64 encoded image data (without data URI prefix)
 */
export async function imageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const longestSide = Math.max(img.width, img.height);

      // Only resize if larger than Gemini optimal (1568px)
      const scale = longestSide > 1568 ? 1568 / longestSide : 1.0;
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);

      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Could not get canvas context')); return; }

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      resolve(dataUrl.replace(/^data:image\/jpeg;base64,/, ''));
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image'));
    };

    img.src = objectUrl;
  });
}

/**
 * Convert any supported file to base64 image for OCR
 * @param file - The file to convert (PDF or image)
 * @returns Object with base64 data and mime type
 */
export async function fileToBase64Image(file: File): Promise<{ base64: string; mimeType: string }> {
  const mimeType = file.type;
  
  if (mimeType === 'application/pdf') {
    // Convert PDF first page to JPEG
    const base64 = await pdfToImage(file);
    return { base64, mimeType: 'image/jpeg' };
  }
  
  // For images, just convert to base64
  const base64 = await imageToBase64(file);
  return { base64, mimeType };
}

/**
 * Get the number of pages in a PDF
 * @param file - The PDF file
 * @returns Number of pages
 */
export async function getPdfPageCount(file: File): Promise<number> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  return pdf.numPages;
}
