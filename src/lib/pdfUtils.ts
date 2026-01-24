import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

/**
 * Convert the first page of a PDF to a base64 image
 * @param file - The PDF file to convert
 * @param scale - Scale factor for rendering (higher = better quality but larger size)
 * @returns Base64 encoded image data (without data URI prefix)
 */
export async function pdfToImage(file: File, scale: number = 2.0): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  // Get the first page
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale });
  
  // Create a canvas to render the page
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  
  if (!context) {
    throw new Error('Could not get canvas context');
  }
  
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  
  // Render the page to the canvas
  await page.render({
    canvasContext: context,
    viewport: viewport,
  }).promise;
  
  // Convert canvas to base64 (remove data URI prefix)
  const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
  return dataUrl.replace(/^data:image\/jpeg;base64,/, '');
}

/**
 * Convert an image file to base64
 * @param file - The image file to convert
 * @returns Base64 encoded image data (without data URI prefix)
 */
export async function imageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data URI prefix
      const base64 = result.replace(/^data:[^;]+;base64,/, '');
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
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
