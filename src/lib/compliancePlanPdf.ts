import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, parseISO } from 'date-fns';
import { loadPdfLogo, drawPdfLogo } from '@/lib/pdfLogoUtils';

interface PlanCertEntry {
  personnelName: string;
  personnelId: string;
  certName: string;
  category: string;
  issuingAuthority: string;
  expiryDate: string;
  daysRemaining: number;
}

export interface CompliancePlanPdfOptions {
  entries: PlanCertEntry[];
  periodLabel: string;
  filterLabel: string;
  businessName?: string;
  summary: { overdue: number; expiring: number; total: number; affectedPersonnel: number; categories: number };
  byPersonnel: [string, PlanCertEntry[]][];
  byIssuer: [string, PlanCertEntry[]][];
}

function getRowFill(days: number): [number, number, number] {
  if (days < 0) return [250, 232, 232]; // red
  if (days < 30) return [255, 245, 230]; // amber
  if (days <= 60) return [255, 252, 235]; // yellow
  return [235, 245, 235]; // green
}

function getDaysLabel(days: number): string {
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return 'Today';
  return `${days}d`;
}

export async function generateCompliancePlanPdf(options: CompliancePlanPdfOptions): Promise<jsPDF> {
  const { entries, periodLabel, filterLabel, businessName, summary, byPersonnel, byIssuer } = options;
  const logoBase64 = await loadPdfLogo();
  const doc = new jsPDF('l');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const generatedDate = format(new Date(), 'd MMM yyyy · HH:mm');
  const headerHeight = 34;

  const drawHeader = () => {
    drawPdfLogo(doc, logoBase64, margin);
    let y = 12;
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(`COMPLIANCE PLAN — NEXT ${periodLabel.toUpperCase()}`, pageWidth / 2, y, { align: 'center' });
    y += 7;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text('FlowSert Workforce Compliance', pageWidth / 2, y, { align: 'center' });
    y += 7;
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    if (businessName) doc.text(`Company: ${businessName}`, margin, y);
    doc.text(`Filter: ${filterLabel}`, pageWidth - margin, y, { align: 'right' });
    y += 4.5;
    doc.text(`Certificates: ${summary.total} | Personnel: ${summary.affectedPersonnel} | Overdue: ${summary.overdue}`, margin, y);
    doc.text(`Generated: ${generatedDate}`, pageWidth - margin, y, { align: 'right' });
    y += 4;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageWidth - margin, y);
    doc.setTextColor(0, 0, 0);
  };

  // ── Section 1: Summary ──
  drawHeader();
  let curY = headerHeight + 2;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Summary', margin, curY);
  curY += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const summaryText = `${summary.total} certificate${summary.total !== 1 ? 's' : ''} expiring within ${periodLabel}, affecting ${summary.affectedPersonnel} personnel across ${summary.categories} categor${summary.categories !== 1 ? 'ies' : 'y'}. ${summary.overdue} already overdue.`;
  doc.text(summaryText, margin, curY);
  curY += 8;

  // ── Section 2: Priority List ──
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Priority List', margin, curY);

  autoTable(doc, {
    startY: curY + 2,
    head: [['Personnel', 'Certificate', 'Category', 'Issuing Authority', 'Expiry Date', 'Status']],
    body: entries.map(e => [
      e.personnelName,
      e.certName,
      e.category,
      e.issuingAuthority,
      format(parseISO(e.expiryDate), 'd MMM yyyy'),
      getDaysLabel(e.daysRemaining),
    ]),
    theme: 'grid',
    showHead: 'everyPage',
    margin: { left: margin, right: margin, top: headerHeight },
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontSize: 6,
      fontStyle: 'bold',
      halign: 'center',
    },
    bodyStyles: { fontSize: 8, valign: 'middle' },
    columnStyles: {
      0: { halign: 'left', fontStyle: 'bold', cellWidth: 45 },
      1: { halign: 'left', cellWidth: 55 },
      2: { halign: 'left', cellWidth: 35 },
      3: { halign: 'left', cellWidth: 50 },
      4: { halign: 'center', cellWidth: 30 },
      5: { halign: 'center', cellWidth: 28 },
    },
    styles: { cellPadding: 3, lineWidth: 0.2, lineColor: [200, 200, 200] },
    didParseCell: (data) => {
      if (data.section !== 'body') return;
      const entry = entries[data.row.index];
      if (entry) data.cell.styles.fillColor = getRowFill(entry.daysRemaining);
    },
    didDrawPage: () => drawHeader(),
  });

  // ── Section 3: Grouped by Personnel ──
  doc.addPage('l');
  drawHeader();
  let y3 = headerHeight + 2;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Grouped by Personnel', margin, y3);

  autoTable(doc, {
    startY: y3 + 2,
    head: [['Personnel', 'Certificate', 'Issuing Authority', 'Expiry Date', 'Status']],
    body: byPersonnel.flatMap(([name, certs]) =>
      certs.map((e, i) => [
        i === 0 ? `${name} (${certs.length})` : '',
        e.certName,
        e.issuingAuthority,
        format(parseISO(e.expiryDate), 'd MMM yyyy'),
        getDaysLabel(e.daysRemaining),
      ])
    ),
    theme: 'grid',
    showHead: 'everyPage',
    margin: { left: margin, right: margin, top: headerHeight },
    headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontSize: 6, fontStyle: 'bold', halign: 'center' },
    bodyStyles: { fontSize: 8, valign: 'middle' },
    columnStyles: {
      0: { halign: 'left', fontStyle: 'bold', cellWidth: 55 },
      1: { halign: 'left', cellWidth: 60 },
      2: { halign: 'left', cellWidth: 55 },
      3: { halign: 'center', cellWidth: 30 },
      4: { halign: 'center', cellWidth: 28 },
    },
    styles: { cellPadding: 3, lineWidth: 0.2, lineColor: [200, 200, 200] },
    didParseCell: (data) => {
      if (data.section !== 'body') return;
      // find the matching entry
      let idx = 0;
      for (const [, certs] of byPersonnel) {
        for (const cert of certs) {
          if (idx === data.row.index) {
            data.cell.styles.fillColor = getRowFill(cert.daysRemaining);
            return;
          }
          idx++;
        }
      }
    },
    didDrawPage: () => drawHeader(),
  });

  // ── Section 4: Grouped by Issuer ──
  doc.addPage('l');
  drawHeader();
  let y4 = headerHeight + 2;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Grouped by Issuing Authority', margin, y4);

  autoTable(doc, {
    startY: y4 + 2,
    head: [['Issuing Authority', 'Personnel', 'Certificate', 'Expiry Date', 'Status']],
    body: byIssuer.flatMap(([issuer, certs]) => {
      const uniqueP = new Set(certs.map(e => e.personnelId)).size;
      return certs.map((e, i) => [
        i === 0 ? `${issuer} (${certs.length} certs, ${uniqueP} personnel)` : '',
        e.personnelName,
        e.certName,
        format(parseISO(e.expiryDate), 'd MMM yyyy'),
        getDaysLabel(e.daysRemaining),
      ]);
    }),
    theme: 'grid',
    showHead: 'everyPage',
    margin: { left: margin, right: margin, top: headerHeight },
    headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontSize: 6, fontStyle: 'bold', halign: 'center' },
    bodyStyles: { fontSize: 8, valign: 'middle' },
    columnStyles: {
      0: { halign: 'left', fontStyle: 'bold', cellWidth: 65 },
      1: { halign: 'left', cellWidth: 50 },
      2: { halign: 'left', cellWidth: 55 },
      3: { halign: 'center', cellWidth: 30 },
      4: { halign: 'center', cellWidth: 28 },
    },
    styles: { cellPadding: 3, lineWidth: 0.2, lineColor: [200, 200, 200] },
    didParseCell: (data) => {
      if (data.section !== 'body') return;
      let idx = 0;
      for (const [, certs] of byIssuer) {
        for (const cert of certs) {
          if (idx === data.row.index) {
            data.cell.styles.fillColor = getRowFill(cert.daysRemaining);
            return;
          }
          idx++;
        }
      }
    },
    didDrawPage: () => drawHeader(),
  });

  // ── Footer pass ──
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(128, 128, 128);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
    doc.text('Generated by FlowSert', pageWidth - margin, pageHeight - 8, { align: 'right' });
  }

  doc.setTextColor(0, 0, 0);
  return doc;
}
