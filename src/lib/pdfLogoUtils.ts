import flowsertLogoBW from '@/assets/flowsert-logo-bw.png';
import jsPDF from 'jspdf';

let cachedLogoBase64: string | null = null;

/**
 * Load the FlowSert B&W logo as a base64 data URI for use in jsPDF.
 * The result is cached after the first call.
 */
export async function loadPdfLogo(): Promise<string> {
  if (cachedLogoBase64) return cachedLogoBase64;

  const response = await fetch(flowsertLogoBW);
  const blob = await response.blob();

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      cachedLogoBase64 = reader.result as string;
      resolve(cachedLogoBase64);
    };
    reader.onerror = () => reject(new Error('Failed to load PDF logo'));
    reader.readAsDataURL(blob);
  });
}

// Logo dimensions in mm (aspect ratio ~3.3:1 based on typical logo)
export const PDF_LOGO_WIDTH = 40;
export const PDF_LOGO_HEIGHT = 12;

/**
 * Draw the FlowSert logo in the top-left corner of a jsPDF page.
 */
export function drawPdfLogo(doc: jsPDF, logoBase64: string, margin: number) {
  doc.addImage(logoBase64, 'PNG', margin, 6, PDF_LOGO_WIDTH, PDF_LOGO_HEIGHT);
}
