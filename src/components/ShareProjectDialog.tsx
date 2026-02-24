import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Project } from '@/hooks/useProjects';
import { Personnel } from '@/types';
import { ProjectPhase } from '@/hooks/useProjectPhases';
import { FileDown, Mail, FileText, Users, FileStack, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getCertificateStatus, getPersonnelOverallStatus, EXPIRY_WARNING_DAYS } from '@/lib/certificateUtils';
import { generateCompetenceMatrixPdf } from '@/lib/competenceMatrixPdf';
import { generateCertificateBundlePdf } from '@/lib/mergeCertificatesPdf';

interface ShareProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
  personnel: Personnel[];
  businessName?: string;
  phases?: ProjectPhase[];
}

export function ShareProjectDialog({
  open,
  onOpenChange,
  project,
  personnel,
  businessName,
  phases = [],
}: ShareProjectDialogProps) {
  const [selectedExports, setSelectedExports] = useState<string[]>([]);
  const [selectedBundlePersonId, setSelectedBundlePersonId] = useState<string>('');
  const [isBundleGenerating, setIsBundleGenerating] = useState(false);
  const [bundleProgress, setBundleProgress] = useState<{ current: number; total: number; label: string } | null>(null);

  const assignedPersonnel = project.assignedPersonnel
    .map((id) => personnel.find((p) => p.id === id))
    .filter((p): p is Personnel => p !== undefined);

  const toggleExport = (exportType: string) => {
    setSelectedExports(prev => 
      prev.includes(exportType) 
        ? prev.filter(e => e !== exportType)
        : [...prev, exportType]
    );
  };

  const generateProjectCardPdf = (): jsPDF => {
    const doc = new jsPDF('l');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;
    const generatedDate = format(new Date(), 'd MMM yyyy · HH:mm');

    const STATUS_SYMBOLS: Record<string, string> = { valid: 'V', expiring: 'E', expired: 'X' };
    const NOT_HELD = '—';
    const STATUS_FILLS: Record<string, [number, number, number] | null> = {
      V: [235, 245, 235],
      E: [255, 245, 230],
      X: [250, 232, 232],
      [NOT_HELD]: null,
    };

    // --- Header height & metadata ---
    const startDateFmt = format(parseISO(project.startDate), 'd MMM yyyy');
    const endDateFmt = project.endDate ? format(parseISO(project.endDate), 'd MMM yyyy') : 'Ongoing';

    const extraFields: [string, string | undefined][] = [
      ['Status', project.status.charAt(0).toUpperCase() + project.status.slice(1)],
      ['Customer', project.customer || undefined],
      ['Location', project.location || undefined],
      ['Project Manager', project.projectManager || undefined],
      ['Work Category', project.workCategory || undefined],
    ];
    const visibleExtras = extraFields.filter(([, v]) => !!v);
    const headerHeight = 34 + visibleExtras.length * 4;

    // --- drawHeader (called by didDrawPage on every page) ---
    const drawHeader = () => {
      let y = 12;

      // Title
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('PROJECT CARD', pageWidth / 2, y, { align: 'center' });
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
      const rightCol = pageWidth - margin;

      if (businessName) {
        doc.text(`Company: ${businessName}`, leftCol, y);
      }
      doc.text(`Project: ${project.name}${project.projectNumber ? ` (${project.projectNumber})` : ''}`, rightCol, y, { align: 'right' });
      y += 4.5;

      doc.text(`Duration: ${startDateFmt} – ${endDateFmt}`, leftCol, y);
      doc.text(`Generated: ${generatedDate}`, rightCol, y, { align: 'right' });
      y += 4.5;

      // Extra fields
      for (const [label, value] of visibleExtras) {
        doc.text(`${label}: ${value}`, leftCol, y);
        y += 4;
      }

      // Horizontal divider
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      doc.line(margin, y, pageWidth - margin, y);

      doc.setTextColor(0, 0, 0);
    };

    // --- Shared table config (matches competenceMatrixPdf.ts exactly) ---
    const sharedTableConfig = {
      theme: 'grid' as const,
      showHead: 'everyPage' as const,
      rowPageBreak: 'avoid' as const,
      margin: { left: margin, right: margin, top: headerHeight },
      headStyles: {
        fillColor: [240, 240, 240] as [number, number, number],
        textColor: [0, 0, 0] as [number, number, number],
        fontSize: 6,
        fontStyle: 'bold' as const,
        halign: 'center' as const,
        valign: 'middle' as const,
        overflow: 'linebreak' as const,
      },
      bodyStyles: {
        fontSize: 8,
        halign: 'center' as const,
        valign: 'middle' as const,
      },
      styles: {
        cellPadding: 3,
        lineWidth: 0.2,
        lineColor: [200, 200, 200] as [number, number, number],
      },
      didDrawPage: () => {
        drawHeader();
      },
    };

    let yPosition = headerHeight + 2;

    const checkPageBreak = (needed: number) => {
      if (yPosition + needed > pageHeight - 20) {
        doc.addPage('l');
        yPosition = headerHeight + 2;
      }
    };

    // --- Draw initial header ---
    drawHeader();

    // --- Description ---
    if (project.description) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Description', margin, yPosition);
      yPosition += 4;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      const descLines = doc.splitTextToSize(project.description, pageWidth - 2 * margin);
      doc.text(descLines, margin, yPosition);
      yPosition += descLines.length * 3.5 + 6;
    }

    // --- Project Phases ---
    if (phases.length > 0) {
      checkPageBreak(30);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(`Project Phases (${phases.length})`, margin, yPosition);
      yPosition += 5;

      const phaseData = phases.map(p => {
        const s = parseISO(p.startDate);
        const e = parseISO(p.endDate);
        const dur = differenceInDays(e, s) + 1;
        return [p.name, format(s, 'd MMM yyyy'), format(e, 'd MMM yyyy'), `${dur} days`];
      });

      autoTable(doc, {
        startY: yPosition,
        head: [['Phase', 'Start', 'End', 'Duration']],
        body: phaseData,
        ...sharedTableConfig,
      });
      yPosition = (doc as any).lastAutoTable.finalY + 8;
    }

    // --- Milestones ---
    const milestones = (project.calendarItems || [])
      .filter(i => i.isMilestone)
      .sort((a, b) => a.date.localeCompare(b.date));

    if (milestones.length > 0) {
      checkPageBreak(30);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(`Milestones (${milestones.length})`, margin, yPosition);
      yPosition += 5;

      autoTable(doc, {
        startY: yPosition,
        head: [['Date', 'Description']],
        body: milestones.map(m => [format(parseISO(m.date), 'd MMM yyyy'), m.description]),
        ...sharedTableConfig,
      });
      yPosition = (doc as any).lastAutoTable.finalY + 8;
    }

    // --- Events ---
    const events = (project.calendarItems || [])
      .filter(i => !i.isMilestone)
      .sort((a, b) => a.date.localeCompare(b.date));

    if (events.length > 0) {
      checkPageBreak(30);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(`Events (${events.length})`, margin, yPosition);
      yPosition += 5;

      autoTable(doc, {
        startY: yPosition,
        head: [['Date', 'Description']],
        body: events.map(e => [format(parseISO(e.date), 'd MMM yyyy'), e.description]),
        ...sharedTableConfig,
      });
      yPosition = (doc as any).lastAutoTable.finalY + 8;
    }

    // --- Assigned Personnel with Compliance ---
    checkPageBreak(30);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(`Assigned Personnel (${assignedPersonnel.length})`, margin, yPosition);
    yPosition += 5;

    if (assignedPersonnel.length > 0) {
      const personnelTableData = assignedPersonnel.map(person => {
        const overallStatus = getPersonnelOverallStatus(person);
        const complianceLabel = overallStatus === 'valid' ? 'V' : overallStatus === 'expiring' ? 'E' : 'X';
        return [
          person.name,
          person.role,
          person.location || '—',
          person.email,
          person.phone || '—',
          complianceLabel,
        ];
      });

      autoTable(doc, {
        startY: yPosition,
        head: [['Name', 'Role', 'Location', 'Email', 'Phone', 'Compliance']],
        body: personnelTableData,
        ...sharedTableConfig,
        didParseCell: (data) => {
          if (data.section !== 'body') return;
          if (data.column.index !== 5) return;
          const val = String(data.cell.raw);
          if (val === 'V') data.cell.styles.fillColor = [235, 245, 235];
          else if (val === 'E') data.cell.styles.fillColor = [255, 245, 230];
          else if (val === 'X') data.cell.styles.fillColor = [250, 232, 232];
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.halign = 'center';
        },
        didDrawPage: () => {
          drawHeader();
        },
      });
      yPosition = (doc as any).lastAutoTable.finalY + 8;
    } else {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(128, 128, 128);
      doc.text('No personnel assigned', margin, yPosition);
      doc.setTextColor(0, 0, 0);
      yPosition += 8;
    }

    // --- Inline Competence Matrix (matches competenceMatrixPdf.ts exactly) ---
    const activePersonnel = assignedPersonnel.filter(p => p.activated);
    if (activePersonnel.length > 0) {
      const sortedPeople = [...activePersonnel].sort((a, b) => a.name.localeCompare(b.name));
      const certTypeSet = new Set<string>();
      activePersonnel.forEach(p => p.certificates.forEach(c => certTypeSet.add(c.name)));
      const certTypes = Array.from(certTypeSet).sort((a, b) => a.localeCompare(b));

      if (certTypes.length > 0) {
        checkPageBreak(40);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('Personnel Competence Matrix', margin, yPosition);
        yPosition += 5;

        // Matching matrix column widths: Name 42, Role 26, Type 20
        const fixedColsWidth = 42 + 26 + 20;
        const availableForCerts = pageWidth - 2 * margin - fixedColsWidth;
        const minCertColWidth = 12;
        const maxCertCols = Math.max(1, Math.floor(availableForCerts / minCertColWidth));

        const batches: string[][] = [];
        for (let i = 0; i < certTypes.length; i += maxCertCols) {
          batches.push(certTypes.slice(i, i + maxCertCols));
        }

        const personFixedCells = sortedPeople.map(person => {
          const role = person.role && person.role !== 'N/A' ? person.role : '-';
          const type = person.category
            ? person.category.charAt(0).toUpperCase() + person.category.slice(1)
            : '-';
          return [person.name, role, type];
        });

        batches.forEach((batchCerts, batchIdx) => {
          if (batchIdx > 0) checkPageBreak(30);

          const batchLabel = batches.length > 1
            ? `Certificates ${batchIdx * maxCertCols + 1}\u2013${Math.min((batchIdx + 1) * maxCertCols, certTypes.length)} of ${certTypes.length}`
            : undefined;

          if (batchLabel) {
            doc.setFontSize(7);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(120, 120, 120);
            doc.text(batchLabel, pageWidth / 2, yPosition, { align: 'center' });
            doc.setTextColor(0, 0, 0);
            yPosition += 4;
          }

          const head = ['Name', 'Role', 'Type', ...batchCerts];
          const body = sortedPeople.map((person, pIdx) => {
            const row = [...personFixedCells[pIdx]];
            batchCerts.forEach(certType => {
              const cert = person.certificates.find(c => c.name === certType);
              if (!cert) {
                row.push(NOT_HELD);
              } else {
                row.push(STATUS_SYMBOLS[getCertificateStatus(cert.expiryDate)] || NOT_HELD);
              }
            });
            return row;
          });

          const certColWidth = batchCerts.length > 0 ? availableForCerts / batchCerts.length : 20;
          const columnStyles: Record<number, any> = {
            0: { halign: 'left' as const, cellWidth: 42, fontStyle: 'bold' as const },
            1: { halign: 'left' as const, cellWidth: 26 },
            2: { halign: 'left' as const, cellWidth: 20 },
          };
          batchCerts.forEach((_, i) => {
            columnStyles[i + 3] = { halign: 'center' as const, cellWidth: certColWidth };
          });

          autoTable(doc, {
            startY: yPosition,
            head: [head],
            body,
            ...sharedTableConfig,
            columnStyles,
            didParseCell: (data) => {
              if (data.section !== 'body') return;
              const colIdx = data.column.index;
              if (colIdx < 3) return;
              const val = String(data.cell.raw);
              const fill = STATUS_FILLS[val];
              if (fill) data.cell.styles.fillColor = fill;
              data.cell.styles.fontStyle = 'bold';
            },
            didDrawPage: () => {
              drawHeader();
            },
          });
          yPosition = (doc as any).lastAutoTable.finalY + 6;
        });
      }
    }

    // --- Legend (once at end, matching matrix) ---
    const finalY = (doc as any).lastAutoTable?.finalY || yPosition;
    const lastPage = doc.getNumberOfPages();
    doc.setPage(lastPage);
    const legendY = Math.min(finalY + 10, pageHeight - 20);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text(
      `Legend:  V \u2013 Valid    E \u2013 Expiring within ${EXPIRY_WARNING_DAYS} days    X \u2013 Expired    \u2014 \u2013 Not required / Not registered`,
      margin,
      legendY,
    );

    // --- Footer (matching matrix exactly) ---
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
  };

  const generatePersonnelCertificatesPdf = (): jsPDF => {
    return generateCompetenceMatrixPdf({
      personnel: assignedPersonnel,
      projectName: project.name,
      companyName: businessName,
    });
  };

  const handleOpenPdfs = async () => {
    if (selectedExports.length === 0) {
      toast.error('Please select at least one export option');
      return;
    }

    try {
      if (selectedExports.includes('projectCard')) {
        const doc = generateProjectCardPdf();
        const fileName = `${project.name.replace(/[^a-z0-9]/gi, '_')}_project_card.pdf`;
        doc.save(fileName);
      }

      if (selectedExports.includes('personnelCertificates')) {
        const doc = generatePersonnelCertificatesPdf();
        const fileName = `${project.name.replace(/[^a-z0-9]/gi, '_')}_personnel_certificates.pdf`;
        doc.save(fileName);
      }

      if (selectedExports.includes('certificateBundle')) {
        await handleBundleDownload();
        return;
      }

      toast.success('PDF(s) downloaded successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    }
  };

  const handleEmailPdfs = async () => {
    if (selectedExports.length === 0) {
      toast.error('Please select at least one export option');
      return;
    }

    try {
      const attachmentNames: string[] = [];

      if (selectedExports.includes('projectCard')) {
        const doc = generateProjectCardPdf();
        const fileName = `${project.name.replace(/[^a-z0-9]/gi, '_')}_project_card.pdf`;
        doc.save(fileName);
        attachmentNames.push(fileName);
      }

      if (selectedExports.includes('personnelCertificates')) {
        const doc = generatePersonnelCertificatesPdf();
        const fileName = `${project.name.replace(/[^a-z0-9]/gi, '_')}_personnel_certificates.pdf`;
        doc.save(fileName);
        attachmentNames.push(fileName);
      }

      // Open email client with subject
      const subject = encodeURIComponent(`Project Documents: ${project.name}`);
      const body = encodeURIComponent(
        `Please find attached the following documents for project "${project.name}":\n\n` +
        attachmentNames.map(name => `- ${name}`).join('\n') +
        '\n\nNote: The PDF files have been downloaded to your device. Please attach them to this email.'
      );
      
      window.open(`mailto:?subject=${subject}&body=${body}`);
      toast.success('PDFs downloaded. Please attach them to the email.');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    }
  };

  const hasSelection = () => {
    if (selectedExports.length === 0) return false;
    if (selectedExports.includes('certificateBundle') && !selectedBundlePersonId) return false;
    return true;
  };

  const handleBundleDownload = async () => {
    const person = assignedPersonnel.find(p => p.id === selectedBundlePersonId);
    if (!person) return;

    const certsWithDocs = person.certificates.filter(c => c.documentUrl);
    if (certsWithDocs.length === 0) {
      toast.error('This person has no uploaded certificate documents.');
      return;
    }
    if (certsWithDocs.length > 30) {
      if (!confirm(`This person has ${certsWithDocs.length} certificates with documents. This may take a while. Continue?`)) return;
    }

    setIsBundleGenerating(true);
    try {
      const { doc, included, skipped, renderFailures } = await generateCertificateBundlePdf({
        person,
        companyName: businessName,
        projectName: project.name,
        onProgress: (current, total, label) => setBundleProgress({ current, total, label }),
      });
      doc.save(`${person.name.replace(/[^a-z0-9]/gi, '_')}_certificate_bundle.pdf`);
      const parts = [`Included ${included} certificate${included !== 1 ? 's' : ''}`];
      if (skipped > 0) parts.push(`skipped ${skipped} missing`);
      if (renderFailures > 0) parts.push(`${renderFailures} render failure${renderFailures !== 1 ? 's' : ''}`);
      toast.success(`Certificate bundle downloaded. ${parts.join(', ')}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate certificate bundle');
    } finally {
      setIsBundleGenerating(false);
      setBundleProgress(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileDown className="h-5 w-5" />
            External Sharing
          </DialogTitle>
          <DialogDescription>
            Select the documents you want to export and choose how to share them.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-2">
          {/* Export Options */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Select exports:</Label>
            
            {/* Project Card Option */}
            <div 
              className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                selectedExports.includes('projectCard') 
                  ? 'bg-primary/10 border-primary' 
                  : 'bg-muted/50 border-border hover:bg-muted'
              }`}
              onClick={() => toggleExport('projectCard')}
            >
              <Checkbox 
                id="projectCard"
                checked={selectedExports.includes('projectCard')}
                className="pointer-events-none"
              />
              <div className="flex items-center gap-3 flex-1">
                <FileText className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium text-sm">Export Full Project Card</p>
                  <p className="text-xs text-muted-foreground">All project details, personnel list, and calendar items</p>
                </div>
              </div>
            </div>

            {/* Personnel & Certificates Option */}
            <div 
              className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                selectedExports.includes('personnelCertificates') 
                  ? 'bg-primary/10 border-primary' 
                  : 'bg-muted/50 border-border hover:bg-muted'
              } ${assignedPersonnel.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => assignedPersonnel.length > 0 && toggleExport('personnelCertificates')}
            >
              <Checkbox 
                id="personnelCertificates"
                checked={selectedExports.includes('personnelCertificates')}
                className="pointer-events-none"
                disabled={assignedPersonnel.length === 0}
              />
              <div className="flex items-center gap-3 flex-1">
                <Users className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium text-sm">Export Personnel & Certificates Matrix</p>
                  <p className="text-xs text-muted-foreground">
                    {assignedPersonnel.length > 0 
                      ? `Detailed certificate overview for ${assignedPersonnel.length} assigned personnel`
                      : 'No personnel assigned to this project'
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Certificate Bundle Option */}
            <div 
              className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                selectedExports.includes('certificateBundle') 
                  ? 'bg-primary/10 border-primary' 
                  : 'bg-muted/50 border-border hover:bg-muted'
              } ${assignedPersonnel.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => assignedPersonnel.length > 0 && toggleExport('certificateBundle')}
            >
              <Checkbox 
                id="certificateBundle"
                checked={selectedExports.includes('certificateBundle')}
                className="pointer-events-none"
                disabled={assignedPersonnel.length === 0}
              />
              <div className="flex items-center gap-3 flex-1">
                <FileStack className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium text-sm">Generate Certificate Bundle</p>
                  <p className="text-xs text-muted-foreground">
                    {assignedPersonnel.length > 0 
                      ? 'Download all uploaded certificates for one person as a merged PDF'
                      : 'No personnel assigned to this project'
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Person selector for certificate bundle */}
            {selectedExports.includes('certificateBundle') && assignedPersonnel.length > 0 && (
              <div className="ml-8 space-y-2">
                <Label className="text-sm">Select person:</Label>
                <Select value={selectedBundlePersonId} onValueChange={setSelectedBundlePersonId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a person..." />
                  </SelectTrigger>
                  <SelectContent>
                    {assignedPersonnel.filter(p => p.activated).map(person => (
                      <SelectItem key={person.id} value={person.id}>
                        {person.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Bundle generation progress */}
            {isBundleGenerating && bundleProgress && (
              <div className="ml-8 space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Processing certificate {bundleProgress.current} of {bundleProgress.total}...</span>
                </div>
                <Progress value={(bundleProgress.current / bundleProgress.total) * 100} className="h-2" />
                <p className="text-xs text-muted-foreground truncate">{bundleProgress.label}</p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button 
              onClick={handleOpenPdfs} 
              className="flex-1 gap-2"
              disabled={!hasSelection() || isBundleGenerating}
            >
              {isBundleGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileDown className="h-4 w-4" />
              )}
              {isBundleGenerating ? 'Generating...' : `Download PDF${selectedExports.length > 1 ? 's' : ''}`}
            </Button>
            <Button 
              variant="outline" 
              onClick={handleEmailPdfs} 
              className="flex-1 gap-2"
              disabled={!hasSelection() || isBundleGenerating}
            >
              <Mail className="h-4 w-4" />
              Send via Email
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
