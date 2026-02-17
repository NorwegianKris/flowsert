import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { Personnel } from '@/types';
import { getCertificateStatus, EXPIRY_WARNING_DAYS } from '@/lib/certificateUtils';

export interface CompetenceMatrixOptions {
  personnel: Personnel[];
  projectName?: string;
  companyName?: string;
}

const STATUS_SYMBOLS: Record<string, string> = {
  valid: 'V',
  expiring: 'E',
  expired: 'X',
};
const NOT_HELD_SYMBOL = '-';

const STATUS_FILLS: Record<string, [number, number, number] | null> = {
  V: [235, 245, 235],
  E: [255, 245, 230],
  X: [250, 232, 232],
  [NOT_HELD_SYMBOL]: null,
};

export function generateCompetenceMatrixPdf(options: CompetenceMatrixOptions): jsPDF {
  const { personnel, projectName, companyName } = options;
  const doc = new jsPDF('l');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const generatedDate = format(new Date(), 'd MMM yyyy · HH:mm');
  const margin = 14;

  // Filter active personnel only, then sort alphabetically
  const activePersonnel = personnel.filter(p => p.activated);
  const sortedPersonnel = [...activePersonnel].sort((a, b) => a.name.localeCompare(b.name));

  // Collect unique certificate types, sorted alphabetically
  const certTypeSet = new Set<string>();
  activePersonnel.forEach(p => {
    p.certificates.forEach(c => certTypeSet.add(c.name));
  });
  const certTypes = Array.from(certTypeSet).sort((a, b) => a.localeCompare(b));

  // ── Header drawing function (called on every page) ──
  const headerHeight = 34;

  const drawHeader = () => {
    let y = 12;

    // Title
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('PERSONNEL COMPETENCE MATRIX', pageWidth / 2, y, { align: 'center' });
    y += 7;

    // Subtitle
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text('FlowSert Workforce Compliance', pageWidth / 2, y, { align: 'center' });
    y += 7;

    // Metadata block
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);

    const leftCol = margin;

    if (companyName) {
      doc.text(`Company: ${companyName}`, leftCol, y);
    }
    doc.text(`Project: ${projectName || 'Personnel Overview'}`, leftCol + 80, y);
    y += 4.5;

    doc.text(`Personnel in export: ${sortedPersonnel.length}`, leftCol, y);
    doc.text(`Generated: ${generatedDate}`, leftCol + 80, y);
    y += 4;

    // Thin horizontal divider
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageWidth - margin, y);

    doc.setTextColor(0, 0, 0);
  };

  // ── Build table data ──
  const fixedColsWidth = 42 + 26 + 20; // Name + Role + Type
  const availableForCerts = pageWidth - 2 * margin - fixedColsWidth;
  const certColWidth = certTypes.length > 0
    ? Math.max(12, Math.min(30, availableForCerts / certTypes.length))
    : 20;

  const tableHead = ['Name', 'Role', 'Type', ...certTypes];

  const tableBody = sortedPersonnel.map(person => {
    const role = person.role && person.role !== 'N/A' ? person.role : '-';
    const type = person.category
      ? person.category.charAt(0).toUpperCase() + person.category.slice(1)
      : '-';
    const row: string[] = [person.name, role, type];
    certTypes.forEach(certType => {
      const cert = person.certificates.find(c => c.name === certType);
      if (!cert) {
        row.push(NOT_HELD_SYMBOL);
      } else {
        const status = getCertificateStatus(cert.expiryDate);
        row.push(STATUS_SYMBOLS[status] || NOT_HELD_SYMBOL);
      }
    });
    return row;
  });

  // ── Column styles ──
  const columnStyles: Record<number, any> = {
    0: { halign: 'left' as const, cellWidth: 42, fontStyle: 'bold' as const },
    1: { halign: 'left' as const, cellWidth: 26 },
    2: { halign: 'left' as const, cellWidth: 20 },
  };
  certTypes.forEach((_, i) => {
    columnStyles[i + 3] = { halign: 'center' as const, cellWidth: certColWidth };
  });

  // ── Render table ──
  autoTable(doc, {
    startY: headerHeight,
    head: [tableHead],
    body: tableBody,
    theme: 'grid',
    showHead: 'everyPage',
    rowPageBreak: 'avoid',
    margin: { left: margin, right: margin, top: headerHeight },
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontSize: 6,
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
      overflow: 'linebreak',
    },
    bodyStyles: {
      fontSize: 8,
      halign: 'center',
      valign: 'middle',
    },
    columnStyles,
    styles: {
      cellPadding: 3,
      lineWidth: 0.2,
      lineColor: [200, 200, 200],
    },
    didParseCell: (data) => {
      if (data.section !== 'body') return;
      const colIdx = data.column.index;
      if (colIdx < 3) return;

      const value = String(data.cell.raw);
      const fill = STATUS_FILLS[value];
      if (fill) {
        data.cell.styles.fillColor = fill;
      }
      data.cell.styles.fontStyle = 'bold';
    },
  });

  const finalY = (doc as any).lastAutoTable?.finalY || headerHeight + 20;

  // ── Legend (last page, below table) ──
  const lastPage = doc.getNumberOfPages();
  doc.setPage(lastPage);
  const legendY = Math.min(finalY + 10, pageHeight - 20);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(
    `Legend:  V \u2013 Valid    E \u2013 Expiring within ${EXPIRY_WARNING_DAYS} days    X \u2013 Expired    - \u2013 Not required / Not registered`,
    margin,
    legendY,
  );

  // ── Draw headers and footers on every page ──
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    drawHeader();

    // Footer
    doc.setFontSize(7);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' },
    );
    doc.text(
      'Generated by FlowSert',
      pageWidth - margin,
      pageHeight - 8,
      { align: 'right' },
    );
  }

  doc.setTextColor(0, 0, 0);
  return doc;
}
