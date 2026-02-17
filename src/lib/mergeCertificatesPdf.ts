import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { format } from 'date-fns';
import { Personnel, Certificate } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { getCertificateStatus } from '@/lib/certificateUtils';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export interface CertificateBundleOptions {
  person: Personnel;
  companyName?: string;
  projectName?: string;
  onProgress?: (current: number, total: number, label: string) => void;
}

export interface CertificateBundleResult {
  doc: jsPDF;
  included: number;
  skipped: number;
}

const MAX_CERTIFICATES = 30;
const MAX_PAGES = 200;
const A4_WIDTH = 210;
const A4_HEIGHT = 297;
const MARGIN = 14;
const CONTENT_WIDTH = A4_WIDTH - MARGIN * 2;
const CONTENT_HEIGHT = A4_HEIGHT - MARGIN * 2 - 10;
const CERT_HEADER_HEIGHT = 16;

const STATUS_SYMBOLS: Record<string, string> = {
  valid: 'V',
  expiring: 'E',
  expired: 'X',
};
const NOT_HELD_SYMBOL = '–';

function extractStoragePath(documentUrl: string): string {
  if (documentUrl.includes('certificate-documents/')) {
    const match = documentUrl.match(/certificate-documents\/(.+)/);
    if (match) return match[1];
  }
  return documentUrl;
}

function getFileType(url: string): 'pdf' | 'image' | 'unknown' {
  const ext = url.split('.').pop()?.toLowerCase().split('?')[0] || '';
  if (ext === 'pdf') return 'pdf';
  if (['jpg', 'jpeg', 'png'].includes(ext)) return 'image';
  return 'unknown';
}

function getImageFormat(url: string): 'JPEG' | 'PNG' {
  const ext = url.split('.').pop()?.toLowerCase().split('?')[0] || '';
  if (ext === 'png') return 'PNG';
  return 'JPEG';
}

/**
 * Overview page: metadata + certificate table
 */
function addOverviewPage(
  doc: jsPDF,
  person: Personnel,
  allCertificates: Certificate[],
  companyName?: string,
) {
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 60;

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('CERTIFICATE BUNDLE', pageWidth / 2, y, { align: 'center' });
  y += 8;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(128, 128, 128);
  doc.text('FlowSert Workforce Compliance', pageWidth / 2, y, { align: 'center' });
  y += 20;

  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);

  if (companyName) {
    doc.text(`Company: ${companyName}`, MARGIN, y);
    y += 5;
  }
  doc.text(`Person: ${person.name}`, MARGIN, y);
  y += 5;
  if (person.role && person.role !== 'N/A') {
    doc.text(`Role: ${person.role}`, MARGIN, y);
    y += 5;
  }
  doc.text(`Generated: ${format(new Date(), 'd MMM yyyy · HH:mm')}`, MARGIN, y);
  y += 8;

  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, pageWidth - MARGIN, y);
  y += 4;

  // Certificate overview table
  const sorted = [...allCertificates].sort((a, b) => a.name.localeCompare(b.name));

  const tableHead = ['Certificate', 'Issuer', 'Issue Date', 'Expiry Date', 'Status'];
  const tableBody = sorted.map(cert => {
    const status = getCertificateStatus(cert.expiryDate);
    return [
      cert.name,
      cert.issuingAuthority || '–',
      cert.dateOfIssue ? format(new Date(cert.dateOfIssue), 'd MMM yyyy') : '–',
      cert.expiryDate ? format(new Date(cert.expiryDate), 'd MMM yyyy') : 'No expiry',
      STATUS_SYMBOLS[status] || NOT_HELD_SYMBOL,
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [tableHead],
    body: tableBody,
    theme: 'grid',
    margin: { left: MARGIN, right: MARGIN },
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontSize: 7,
      fontStyle: 'bold',
      halign: 'left',
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [60, 60, 60],
    },
    columnStyles: {
      0: { cellWidth: 50 },
      4: { halign: 'center' as const, cellWidth: 16, fontStyle: 'bold' as const },
    },
    styles: {
      cellPadding: 2,
      lineWidth: 0.2,
      lineColor: [200, 200, 200],
    },
  });

  doc.setTextColor(0, 0, 0);
}

/**
 * Compact header overlay on the first page of each certificate document.
 * Returns the y-position where document content should start.
 */
function addCertificateHeader(doc: jsPDF, cert: Certificate): number {
  let y = MARGIN;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60, 60, 60);
  doc.text(cert.name, MARGIN, y + 4);
  y += 7;

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(128, 128, 128);

  const parts: string[] = [];
  if (cert.issuingAuthority) parts.push(`Issuer: ${cert.issuingAuthority}`);
  parts.push(`Issued: ${cert.dateOfIssue ? format(new Date(cert.dateOfIssue), 'd MMM yyyy') : 'N/A'}`);
  parts.push(`Expires: ${cert.expiryDate ? format(new Date(cert.expiryDate), 'd MMM yyyy') : 'No expiry'}`);

  doc.text(parts.join('  |  '), MARGIN, y + 3);
  y += 6;

  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y + 1, A4_WIDTH - MARGIN, y + 1);

  doc.setTextColor(0, 0, 0);
  return y + 3; // content starts here
}

function addFooters(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(160, 160, 160);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
    doc.text('Generated by FlowSert', pageWidth - MARGIN, pageHeight - 8, { align: 'right' });
  }
}

export async function generateCertificateBundlePdf(
  options: CertificateBundleOptions,
): Promise<CertificateBundleResult> {
  const { person, companyName, onProgress } = options;

  const certsWithDocs = person.certificates
    .filter(c => c.documentUrl)
    .sort((a, b) => a.name.localeCompare(b.name));

  if (certsWithDocs.length === 0) {
    throw new Error('No certificates with uploaded documents found for this person.');
  }

  if (certsWithDocs.length > MAX_CERTIFICATES) {
    throw new Error(
      `This person has ${certsWithDocs.length} certificates with documents, which exceeds the limit of ${MAX_CERTIFICATES}. Please contact support for large exports.`,
    );
  }

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // Overview page with table of ALL certificates
  addOverviewPage(doc, person, person.certificates, companyName);

  let included = 0;
  let skipped = 0;

  for (let i = 0; i < certsWithDocs.length; i++) {
    const cert = certsWithDocs[i];
    onProgress?.(i + 1, certsWithDocs.length, cert.name);

    const storagePath = extractStoragePath(cert.documentUrl!);
    const fileType = getFileType(cert.documentUrl!);

    if (fileType === 'unknown') {
      skipped++;
      continue;
    }

    const { data: blob, error } = await supabase.storage
      .from('certificate-documents')
      .download(storagePath);

    if (error || !blob) {
      console.warn(`Failed to download certificate document: ${storagePath}`, error?.message);
      skipped++;
      continue;
    }

    try {
      if (fileType === 'pdf') {
        const arrayBuffer = await blob.arrayBuffer();
        const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const numPages = pdfDoc.numPages;

        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
          if (doc.getNumberOfPages() > MAX_PAGES) {
            throw new Error(
              `Certificate bundle exceeded ${MAX_PAGES} pages. Export aborted to prevent excessive file size.`,
            );
          }

          const page = await pdfDoc.getPage(pageNum);
          const viewport = page.getViewport({ scale: 1.5 });

          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          if (!context) continue;

          canvas.width = viewport.width;
          canvas.height = viewport.height;
          await page.render({ canvasContext: context, viewport }).promise;
          const imgData = canvas.toDataURL('image/jpeg', 0.85);

          doc.addPage();

          const isFirstPage = pageNum === 1;
          const contentTop = isFirstPage ? addCertificateHeader(doc, cert) : MARGIN;
          const availableHeight = A4_HEIGHT - contentTop - MARGIN - 10;

          const ratio = Math.min(
            CONTENT_WIDTH / (viewport.width * 0.264583),
            availableHeight / (viewport.height * 0.264583),
          );
          const imgWidthMm = viewport.width * 0.264583 * ratio;
          const imgHeightMm = viewport.height * 0.264583 * ratio;
          const xOffset = MARGIN + (CONTENT_WIDTH - imgWidthMm) / 2;
          const yOffset = contentTop + (availableHeight - imgHeightMm) / 2;

          doc.addImage(imgData, 'JPEG', xOffset, yOffset, imgWidthMm, imgHeightMm);

          canvas.width = 0;
          canvas.height = 0;
        }

        included++;
      } else if (fileType === 'image') {
        const imgFormat = getImageFormat(cert.documentUrl!);
        const arrayBuffer = await blob.arrayBuffer();
        const base64 = btoa(
          new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ''),
        );
        const dataUri = `data:image/${imgFormat.toLowerCase()};base64,${base64}`;

        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const image = new Image();
          image.onload = () => resolve(image);
          image.onerror = () => reject(new Error('Failed to load image'));
          image.src = dataUri;
        });

        doc.addPage();

        const contentTop = addCertificateHeader(doc, cert);
        const availableHeight = A4_HEIGHT - contentTop - MARGIN - 10;

        const imgAspect = img.width / img.height;
        const pageAspect = CONTENT_WIDTH / availableHeight;

        let imgWidthMm: number;
        let imgHeightMm: number;

        if (imgAspect > pageAspect) {
          imgWidthMm = CONTENT_WIDTH;
          imgHeightMm = CONTENT_WIDTH / imgAspect;
        } else {
          imgHeightMm = availableHeight;
          imgWidthMm = availableHeight * imgAspect;
        }

        const xOffset = MARGIN + (CONTENT_WIDTH - imgWidthMm) / 2;
        const yOffset = contentTop + (availableHeight - imgHeightMm) / 2;

        doc.addImage(dataUri, imgFormat, xOffset, yOffset, imgWidthMm, imgHeightMm);

        included++;
      }
    } catch (renderError) {
      if (renderError instanceof Error && renderError.message.includes('exceeded')) {
        throw renderError;
      }
      console.warn(`Failed to render certificate document: ${cert.name}`, renderError);
      skipped++;
    }
  }

  addFooters(doc);

  return { doc, included, skipped };
}
