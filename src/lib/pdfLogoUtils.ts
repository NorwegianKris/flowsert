import flowsertLogoBW from '@/assets/flowsert-logo-bw.png';
import jsPDF from 'jspdf';

let cachedLogoBase64: string | null = null;
let cachedAspectRatio: number = 3.33; // fallback

/**
 * Load the FlowSert B&W logo as a base64 data URI for use in jsPDF.
 * Also measures the image's natural dimensions to cache the true aspect ratio.
 * The result is cached after the first call.
 */
export async function loadPdfLogo(): Promise<string> {
  if (cachedLogoBase64) return cachedLogoBase64;

  const response = await fetch(flowsertLogoBW);
  const blob = await response.blob();

  const base64: string = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to load PDF logo'));
    reader.readAsDataURL(blob);
  });

  // Measure natural pixel dimensions to derive true aspect ratio
  await new Promise<void>((resolve) => {
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth && img.naturalHeight) {
        cachedAspectRatio = img.naturalWidth / img.naturalHeight;
      }
      resolve();
    };
    img.onerror = () => resolve(); // keep fallback ratio
    img.src = base64;
  });

  cachedLogoBase64 = base64;
  return cachedLogoBase64;
}

// Fixed height in mm; width computed from true aspect ratio
export const PDF_LOGO_HEIGHT = 12;
export function getPdfLogoWidth(): number {
  return PDF_LOGO_HEIGHT * cachedAspectRatio;
}

/**
 * Draw the FlowSert logo in the top-left corner of a jsPDF page.
 */
export function drawPdfLogo(doc: jsPDF, logoBase64: string, margin: number) {
  doc.addImage(logoBase64, 'PNG', margin, 6, getPdfLogoWidth(), PDF_LOGO_HEIGHT);
}
