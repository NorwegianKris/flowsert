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
import { Project } from '@/hooks/useProjects';
import { Personnel } from '@/types';
import { FileDown, Mail, FileText, Users } from 'lucide-react';
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
  const [selectedExports, setSelectedExports] = useState<string[]>([]);

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
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPosition = 20;

    // Title
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(project.name, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;

    // Project status badge
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const statusText = project.status.charAt(0).toUpperCase() + project.status.slice(1);
    doc.text(`Status: ${statusText}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;

    // Project details section
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Project Details', 14, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    // Duration
    const startDate = format(parseISO(project.startDate), 'MMM d, yyyy');
    const endDate = project.endDate ? format(parseISO(project.endDate), 'MMM d, yyyy') : 'Ongoing';
    doc.text(`Duration: ${startDate} - ${endDate}`, 14, yPosition);
    yPosition += 6;

    // Project Number
    if (project.projectNumber) {
      doc.text(`Project Number: ${project.projectNumber}`, 14, yPosition);
      yPosition += 6;
    }

    // Customer
    if (project.customer) {
      doc.text(`Customer: ${project.customer}`, 14, yPosition);
      yPosition += 6;
    }

    // Location
    if (project.location) {
      doc.text(`Location: ${project.location}`, 14, yPosition);
      yPosition += 6;
    }

    // Project Manager
    if (project.projectManager) {
      doc.text(`Project Manager: ${project.projectManager}`, 14, yPosition);
      yPosition += 6;
    }

    // Work Category
    if (project.workCategory) {
      doc.text(`Work Category: ${project.workCategory}`, 14, yPosition);
      yPosition += 6;
    }

    // Description
    if (project.description) {
      yPosition += 4;
      doc.setFont('helvetica', 'bold');
      doc.text('Description:', 14, yPosition);
      yPosition += 6;
      doc.setFont('helvetica', 'normal');
      const descLines = doc.splitTextToSize(project.description, pageWidth - 28);
      doc.text(descLines, 14, yPosition);
      yPosition += descLines.length * 5 + 8;
    }

    // Assigned Personnel section
    yPosition += 5;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`Assigned Personnel (${assignedPersonnel.length})`, 14, yPosition);
    yPosition += 10;

    if (assignedPersonnel.length > 0) {
      const personnelTableData = assignedPersonnel.map(person => [
        person.name,
        person.role,
        person.location || 'N/A',
        person.email,
        person.phone || 'N/A'
      ]);

      autoTable(doc, {
        startY: yPosition,
        head: [['Name', 'Role', 'Location', 'Email', 'Phone']],
        body: personnelTableData,
        theme: 'striped',
        headStyles: { 
          fillColor: [59, 130, 246],
          fontSize: 9,
          fontStyle: 'bold'
        },
        bodyStyles: { fontSize: 9 },
        margin: { left: 14, right: 14 },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 10;
    } else {
      doc.setFontSize(10);
      doc.setTextColor(128, 128, 128);
      doc.text('No personnel assigned', 14, yPosition);
      doc.setTextColor(0, 0, 0);
      yPosition += 10;
    }

    // Calendar items section
    if (project.calendarItems && project.calendarItems.length > 0) {
      if (yPosition > 240) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(`Calendar Items (${project.calendarItems.length})`, 14, yPosition);
      yPosition += 10;

      const calendarTableData = project.calendarItems.map(item => [
        format(parseISO(item.date), 'MMM d, yyyy'),
        item.description,
        item.isMilestone ? 'Yes' : 'No'
      ]);

      autoTable(doc, {
        startY: yPosition,
        head: [['Date', 'Description', 'Milestone']],
        body: calendarTableData,
        theme: 'striped',
        headStyles: { 
          fillColor: [59, 130, 246],
          fontSize: 9,
          fontStyle: 'bold'
        },
        bodyStyles: { fontSize: 9 },
        margin: { left: 14, right: 14 },
      });
    }

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

    return doc;
  };

  const generatePersonnelCertificatesPdf = (): jsPDF => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPosition = 20;

    // Title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(`${project.name} - Personnel & Certificates`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;

    // Loop through each personnel
    assignedPersonnel.forEach((person, personIndex) => {
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
          bodyStyles: { fontSize: 8 },
          columnStyles: {
            0: { cellWidth: 35 },
            1: { cellWidth: 25 },
            2: { cellWidth: 25 },
            3: { cellWidth: 25 },
            4: { cellWidth: 20 },
            5: { cellWidth: 35 }
          },
          margin: { left: 14, right: 14 },
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

    return doc;
  };

  const handleOpenPdfs = () => {
    if (selectedExports.length === 0) {
      toast.error('Please select at least one export option');
      return;
    }

    try {
      // Download PDFs - more reliable than window.open which can be blocked
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

  const hasSelection = selectedExports.length > 0;

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
                onCheckedChange={() => toggleExport('projectCard')}
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
                onCheckedChange={() => assignedPersonnel.length > 0 && toggleExport('personnelCertificates')}
                disabled={assignedPersonnel.length === 0}
              />
              <div className="flex items-center gap-3 flex-1">
                <Users className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium text-sm">Export Personnel & Certificates</p>
                  <p className="text-xs text-muted-foreground">
                    {assignedPersonnel.length > 0 
                      ? `Detailed certificate overview for ${assignedPersonnel.length} assigned personnel`
                      : 'No personnel assigned to this project'
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button 
              onClick={handleOpenPdfs} 
              className="flex-1 gap-2"
              disabled={!hasSelection}
            >
              <FileDown className="h-4 w-4" />
              Download PDF{selectedExports.length > 1 ? 's' : ''}
            </Button>
            <Button 
              variant="outline" 
              onClick={handleEmailPdfs} 
              className="flex-1 gap-2"
              disabled={!hasSelection}
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
