import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Project } from '@/hooks/useProjects';
import { Personnel } from '@/types';
import { Copy, Check, Mail, Link, FileDown } from 'lucide-react';
import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getCertificateStatus, getDaysUntilExpiry, formatExpiryText } from '@/lib/certificateUtils';

interface ShareProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
  personnel: Personnel[];
}

export function ShareProjectDialog({
  open,
  onOpenChange,
  project,
  personnel,
}: ShareProjectDialogProps) {
  const [copied, setCopied] = useState(false);

  const assignedPersonnel = project.assignedPersonnel
    .map((id) => personnel.find((p) => p.id === id))
    .filter((p): p is Personnel => p !== undefined);

  const generateShareText = () => {
    const lines = [
      `PROJECT: ${project.name}`,
      `Status: ${project.status.charAt(0).toUpperCase() + project.status.slice(1)}`,
      '',
      `Description: ${project.description}`,
      '',
      `Duration: ${format(parseISO(project.startDate), 'MMM d, yyyy')} - ${project.endDate ? format(parseISO(project.endDate), 'MMM d, yyyy') : 'Ongoing'}`,
      '',
      `Assigned Personnel (${assignedPersonnel.length}):`,
      ...assignedPersonnel.map((p) => `  • ${p.name} - ${p.role}`),
    ];

    if (project.calendarItems && project.calendarItems.length > 0) {
      lines.push('', `Calendar Items (${project.calendarItems.length}):`);
      project.calendarItems.forEach((item) => {
        lines.push(`  • ${format(parseISO(item.date), 'MMM d, yyyy')}: ${item.description}`);
      });
    }

    return lines.join('\n');
  };

  const shareText = generateShareText();

  const handleExportPdf = () => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let yPosition = 20;

      // Title
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text(project.name, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;

      // Project status
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Status: ${project.status.charAt(0).toUpperCase() + project.status.slice(1)}`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;

      // Project details
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Project Details', 14, yPosition);
      yPosition += 8;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      const startDate = format(parseISO(project.startDate), 'MMM d, yyyy');
      const endDate = project.endDate ? format(parseISO(project.endDate), 'MMM d, yyyy') : 'Ongoing';
      doc.text(`Duration: ${startDate} - ${endDate}`, 14, yPosition);
      yPosition += 6;

      if (project.customer) {
        doc.text(`Customer: ${project.customer}`, 14, yPosition);
        yPosition += 6;
      }

      if (project.location) {
        doc.text(`Location: ${project.location}`, 14, yPosition);
        yPosition += 6;
      }

      if (project.projectManager) {
        doc.text(`Project Manager: ${project.projectManager}`, 14, yPosition);
        yPosition += 6;
      }

      if (project.description) {
        yPosition += 4;
        doc.text('Description:', 14, yPosition);
        yPosition += 6;
        const descLines = doc.splitTextToSize(project.description, pageWidth - 28);
        doc.text(descLines, 14, yPosition);
        yPosition += descLines.length * 5 + 4;
      }

      yPosition += 10;

      // Personnel section
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`Assigned Personnel (${assignedPersonnel.length})`, 14, yPosition);
      yPosition += 10;

      // Loop through each personnel
      assignedPersonnel.forEach((person, personIndex) => {
        // Check if we need a new page
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }

        // Personnel header
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(`${personIndex + 1}. ${person.name}`, 14, yPosition);
        yPosition += 6;

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`Role: ${person.role} | Location: ${person.location || 'N/A'}`, 18, yPosition);
        yPosition += 8;

        // Certificate table for this person
        if (person.certificates && person.certificates.length > 0) {
          const certTableData = person.certificates.map(cert => {
            const status = getCertificateStatus(cert.expiryDate);
            const daysUntil = getDaysUntilExpiry(cert.expiryDate);
            const expiryText = formatExpiryText(daysUntil);
            const statusText = status.charAt(0).toUpperCase() + status.slice(1);
            
            return [
              cert.name,
              cert.category || 'Uncategorized',
              cert.dateOfIssue ? format(parseISO(cert.dateOfIssue), 'MMM d, yyyy') : 'N/A',
              cert.expiryDate ? format(parseISO(cert.expiryDate), 'MMM d, yyyy') : 'No expiry',
              statusText,
              expiryText
            ];
          });

          autoTable(doc, {
            startY: yPosition,
            head: [['Certificate', 'Category', 'Issue Date', 'Expiry Date', 'Status', 'Days Until Expiry']],
            body: certTableData,
            theme: 'striped',
            headStyles: { 
              fillColor: [59, 130, 246],
              fontSize: 8,
              fontStyle: 'bold'
            },
            bodyStyles: { 
              fontSize: 8 
            },
            columnStyles: {
              0: { cellWidth: 35 },
              1: { cellWidth: 25 },
              2: { cellWidth: 25 },
              3: { cellWidth: 25 },
              4: { cellWidth: 20 },
              5: { cellWidth: 35 }
            },
            margin: { left: 14, right: 14 },
            didDrawPage: () => {
              yPosition = 20;
            }
          });

          yPosition = (doc as any).lastAutoTable.finalY + 12;
        } else {
          doc.setFontSize(9);
          doc.setTextColor(128, 128, 128);
          doc.text('No certificates on file', 18, yPosition);
          doc.setTextColor(0, 0, 0);
          yPosition += 10;
        }
      });

      // Footer with generation date
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(
          `Generated on ${format(new Date(), 'MMM d, yyyy HH:mm')} | Page ${i} of ${pageCount}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }

      // Save the PDF
      const fileName = `${project.name.replace(/[^a-z0-9]/gi, '_')}_personnel_certificates.pdf`;
      doc.save(fileName);
      toast.success('PDF exported successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      toast.success('Project details copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleEmailShare = () => {
    const subject = encodeURIComponent(`Project Details: ${project.name}`);
    const body = encodeURIComponent(shareText);
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            Share Project
          </DialogTitle>
          <DialogDescription>
            Share the project details with team members or external stakeholders.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Project Summary</Label>
            <div className="relative">
              <textarea
                readOnly
                value={shareText}
                className="w-full h-48 p-3 text-sm bg-muted rounded-md border border-border resize-none focus:outline-none"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleCopy} className="flex-1 gap-2">
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy to Clipboard
                </>
              )}
            </Button>
            <Button variant="outline" onClick={handleEmailShare} className="gap-2">
              <Mail className="h-4 w-4" />
              Email
            </Button>
          </div>
          <Button 
            variant="secondary" 
            onClick={handleExportPdf} 
            className="w-full gap-2"
            disabled={assignedPersonnel.length === 0}
          >
            <FileDown className="h-4 w-4" />
            Export Personnel & Certificates (PDF)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
