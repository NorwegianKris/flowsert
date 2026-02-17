import { useState, useMemo } from 'react';
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
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Project } from '@/hooks/useProjects';
import { Personnel } from '@/types';
import { FileDown, Mail, FileText, Users, Search, X, GripVertical, FileStack, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getCertificateStatus, getDaysUntilExpiry, formatExpiryText } from '@/lib/certificateUtils';
import { generateCompetenceMatrixPdf } from '@/lib/competenceMatrixPdf';
import { generateCertificateBundlePdf } from '@/lib/mergeCertificatesPdf';

interface ExternalSharingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: Project[];
  personnel: Personnel[];
  businessName?: string;
}

type RecipientGroup = 'employee' | 'freelancer';

export function ExternalSharingDialog({
  open,
  onOpenChange,
  projects,
  personnel,
  businessName,
}: ExternalSharingDialogProps) {
  const [selectedExports, setSelectedExports] = useState<string[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedGroups, setSelectedGroups] = useState<RecipientGroup[]>([]);
  const [selectedIndividuals, setSelectedIndividuals] = useState<string[]>([]);
  const [showIndividualSelect, setShowIndividualSelect] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [listHeight, setListHeight] = useState(160);
  const [isBundleGenerating, setIsBundleGenerating] = useState(false);
  const [bundleProgress, setBundleProgress] = useState<{ current: number; total: number; label: string } | null>(null);

  const groupLabels: Record<RecipientGroup, string> = {
    employee: 'Employees',
    freelancer: 'Freelancers',
  };

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  const toggleExport = (exportType: string) => {
    setSelectedExports(prev =>
      prev.includes(exportType)
        ? prev.filter(e => e !== exportType)
        : [...prev, exportType]
    );
  };

  const toggleGroup = (group: RecipientGroup) => {
    setSelectedGroups(prev =>
      prev.includes(group)
        ? prev.filter(g => g !== group)
        : [...prev, group]
    );
  };

  const toggleIndividual = (personnelId: string) => {
    setSelectedIndividuals(prev =>
      prev.includes(personnelId)
        ? prev.filter(id => id !== personnelId)
        : [...prev, personnelId]
    );
  };

  const getSelectedPersonnel = (): Personnel[] => {
    const groupRecipients = personnel.filter(p => {
      if (selectedGroups.includes('employee') && p.category === 'employee') return true;
      if (selectedGroups.includes('freelancer') && p.category === 'freelancer') return true;
      return false;
    });

    const individualRecipients = personnel.filter(p => selectedIndividuals.includes(p.id));

    const allSelected = [...groupRecipients, ...individualRecipients];
    return allSelected.filter((p, index, self) =>
      index === self.findIndex(t => t.id === p.id)
    );
  };

  const selectedPersonnelCount = getSelectedPersonnel().length;

  const filteredPersonnel = useMemo(() => {
    if (!searchQuery.trim()) return personnel;
    const query = searchQuery.toLowerCase();
    return personnel.filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.role?.toLowerCase().includes(query)
    );
  }, [personnel, searchQuery]);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = listHeight;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientY - startY;
      const newHeight = Math.max(100, Math.min(400, startHeight + delta));
      setListHeight(newHeight);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const generateProjectCardPdf = (project: Project): jsPDF => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPosition = 20;

    const assignedPersonnel = project.assignedPersonnel
      .map(id => personnel.find(p => p.id === id))
      .filter((p): p is Personnel => p !== undefined);

    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(project.name, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const statusText = project.status.charAt(0).toUpperCase() + project.status.slice(1);
    doc.text(`Status: ${statusText}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Project Details', 14, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    const startDate = format(parseISO(project.startDate), 'MMM d, yyyy');
    const endDate = project.endDate ? format(parseISO(project.endDate), 'MMM d, yyyy') : 'Ongoing';
    doc.text(`Duration: ${startDate} - ${endDate}`, 14, yPosition);
    yPosition += 6;

    if (project.projectNumber) {
      doc.text(`Project Number: ${project.projectNumber}`, 14, yPosition);
      yPosition += 6;
    }

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

    if (project.workCategory) {
      doc.text(`Work Category: ${project.workCategory}`, 14, yPosition);
      yPosition += 6;
    }

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

  const generatePersonnelCertificatesPdf = (selectedPersonnel: Personnel[]): jsPDF => {
    return generateCompetenceMatrixPdf({
      personnel: selectedPersonnel,
      projectName: selectedProject?.name,
      companyName: businessName,
    });
  };

  const handleDownloadPdfs = async () => {
    if (selectedExports.length === 0) {
      toast.error('Please select at least one export option');
      return;
    }

    try {
      if (selectedExports.includes('projectCard')) {
        if (!selectedProject) {
          toast.error('Please select a project to export');
          return;
        }
        const doc = generateProjectCardPdf(selectedProject);
        const fileName = `${selectedProject.name.replace(/[^a-z0-9]/gi, '_')}_project_card.pdf`;
        doc.save(fileName);
      }

      if (selectedExports.includes('personnelCertificates')) {
        const selectedPeople = getSelectedPersonnel();
        if (selectedPeople.length === 0) {
          toast.error('Please select personnel to export');
          return;
        }
        const doc = generatePersonnelCertificatesPdf(selectedPeople);
        const fileName = `personnel_certificates_report.pdf`;
        doc.save(fileName);
      }

      if (selectedExports.includes('certificateBundle')) {
        await handleBundleDownload();
        return; // bundle handles its own toast
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
        if (!selectedProject) {
          toast.error('Please select a project to export');
          return;
        }
        const doc = generateProjectCardPdf(selectedProject);
        const fileName = `${selectedProject.name.replace(/[^a-z0-9]/gi, '_')}_project_card.pdf`;
        doc.save(fileName);
        attachmentNames.push(fileName);
      }

      if (selectedExports.includes('personnelCertificates')) {
        const selectedPeople = getSelectedPersonnel();
        if (selectedPeople.length === 0) {
          toast.error('Please select personnel to export');
          return;
        }
        const doc = generatePersonnelCertificatesPdf(selectedPeople);
        const fileName = `personnel_certificates_report.pdf`;
        doc.save(fileName);
        attachmentNames.push(fileName);
      }

      const subject = encodeURIComponent('Export Documents');
      const body = encodeURIComponent(
        `Please find attached the following documents:\n\n` +
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

  const canDownload = () => {
    if (selectedExports.length === 0) return false;
    if (selectedExports.includes('projectCard') && !selectedProjectId) return false;
    if (selectedExports.includes('personnelCertificates') && selectedPersonnelCount === 0) return false;
    if (selectedExports.includes('certificateBundle') && selectedPersonnelCount !== 1) return false;
    return true;
  };

  const handleBundleDownload = async () => {
    const selected = getSelectedPersonnel();
    if (selected.length !== 1) return;
    const person = selected[0];

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
      const { doc, included, skipped } = await generateCertificateBundlePdf({
        person,
        companyName: businessName,
        projectName: selectedProject?.name,
        onProgress: (current, total, label) => setBundleProgress({ current, total, label }),
      });
      doc.save(`${person.name.replace(/[^a-z0-9]/gi, '_')}_certificate_bundle.pdf`);
      toast.success(`Certificate bundle downloaded. Included ${included} certificate${included !== 1 ? 's' : ''}${skipped > 0 ? `, skipped ${skipped} missing documents` : ''}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate certificate bundle');
    } finally {
      setIsBundleGenerating(false);
      setBundleProgress(null);
    }
  };

  const handleClose = () => {
    setSelectedExports([]);
    setSelectedProjectId('');
    setSelectedGroups([]);
    setSelectedIndividuals([]);
    setShowIndividualSelect(false);
    setSearchQuery('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileDown className="h-5 w-5" />
            External Sharing
          </DialogTitle>
          <DialogDescription>
            Select the documents you want to export and choose how to share them.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 flex-1 overflow-y-auto">
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
                  <p className="font-medium text-sm">Export Project Card</p>
                  <p className="text-xs text-muted-foreground">All project details, personnel list, and calendar items</p>
                </div>
              </div>
            </div>

            {/* Project Selection (when project card is selected) */}
            {selectedExports.includes('projectCard') && (
              <div className="ml-8 space-y-2">
                <Label className="text-sm">Select project:</Label>
                <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a project..." />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map(project => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Personnel & Certificates Option */}
            <div
              className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                selectedExports.includes('personnelCertificates')
                  ? 'bg-primary/10 border-primary'
                  : 'bg-muted/50 border-border hover:bg-muted'
              }`}
              onClick={() => toggleExport('personnelCertificates')}
            >
              <Checkbox
                id="personnelCertificates"
                checked={selectedExports.includes('personnelCertificates')}
                className="pointer-events-none"
              />
              <div className="flex items-center gap-3 flex-1">
                <Users className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium text-sm">Export Personnel & Certificates</p>
                  <p className="text-xs text-muted-foreground">
                    Detailed certificate overview for selected personnel
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
              }`}
              onClick={() => toggleExport('certificateBundle')}
            >
              <Checkbox
                id="certificateBundle"
                checked={selectedExports.includes('certificateBundle')}
                className="pointer-events-none"
              />
              <div className="flex items-center gap-3 flex-1">
                <FileStack className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium text-sm">Generate Certificate Bundle</p>
                  <p className="text-xs text-muted-foreground">
                    Download all uploaded certificates for one person as a merged PDF
                  </p>
                </div>
              </div>
            </div>

            {/* Certificate bundle single-person warning */}
            {selectedExports.includes('certificateBundle') && selectedPersonnelCount > 1 && (
              <p className="ml-8 text-xs text-destructive">
                Select one person to generate a certificate bundle.
              </p>
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

            {/* Personnel Selection (when personnel certificates or certificate bundle is selected) */}
            {(selectedExports.includes('personnelCertificates') || selectedExports.includes('certificateBundle')) && (
              <div className="ml-8 space-y-3">
                {/* Group Selection */}
                <div className="space-y-2">
                  <Label className="text-sm">Select by group:</Label>
                  <div className="flex flex-wrap gap-2">
                    {(Object.keys(groupLabels) as RecipientGroup[]).map(group => (
                      <Button
                        key={group}
                        variant={selectedGroups.includes(group) ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => toggleGroup(group)}
                        className="gap-2"
                      >
                        {selectedGroups.includes(group) && <span>✓</span>}
                        {groupLabels[group]}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Individual Selection Toggle */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowIndividualSelect(!showIndividualSelect)}
                  className="text-muted-foreground"
                >
                  <Users className="h-4 w-4 mr-2" />
                  {showIndividualSelect ? 'Hide individual selection' : 'Or select individuals...'}
                </Button>

                {/* Individual Personnel Selection */}
                {showIndividualSelect && (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by name or role..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="pl-9"
                      />
                    </div>

                    <div className="border rounded-md overflow-hidden">
                      <ScrollArea style={{ height: listHeight }} className="p-2">
                        <div className="space-y-1">
                          {filteredPersonnel.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              No personnel found matching "{searchQuery}"
                            </p>
                          ) : (
                            filteredPersonnel.map(p => (
                              <div
                                key={p.id}
                                role="button"
                                tabIndex={0}
                                className={`flex items-center gap-3 p-2.5 rounded-md cursor-pointer hover:bg-muted transition-colors w-full ${
                                  selectedIndividuals.includes(p.id) ? 'bg-primary/10 ring-1 ring-primary/20' : ''
                                }`}
                                onClick={() => toggleIndividual(p.id)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    toggleIndividual(p.id);
                                  }
                                }}
                              >
                                <Checkbox
                                  checked={selectedIndividuals.includes(p.id)}
                                  className="pointer-events-none"
                                />
                                <span className="text-sm flex-1 truncate">{p.name}</span>
                                <span className="text-xs text-muted-foreground truncate max-w-[120px]">{p.role}</span>
                                {p.category === 'freelancer' && (
                                  <Badge variant="secondary" className="text-xs shrink-0">
                                    Freelancer
                                  </Badge>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </ScrollArea>

                      <div
                        className="h-3 bg-muted/50 hover:bg-muted cursor-ns-resize flex items-center justify-center border-t"
                        onMouseDown={handleResizeStart}
                      >
                        <GripVertical className="h-3 w-3 text-muted-foreground rotate-90" />
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      {filteredPersonnel.length} of {personnel.length} personnel shown • Drag bottom edge to resize
                    </p>
                  </div>
                )}

                {/* Selected Personnel Summary */}
                {(selectedGroups.length > 0 || selectedIndividuals.length > 0) && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Selected: {selectedPersonnelCount}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedGroups([]);
                          setSelectedIndividuals([]);
                        }}
                        className="h-6 px-2 text-xs"
                      >
                        Clear all
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {selectedGroups.map(g => (
                        <Badge key={g} variant="secondary" className="text-xs">
                          {groupLabels[g]}
                          <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => toggleGroup(g)} />
                        </Badge>
                      ))}
                      {selectedIndividuals.slice(0, 5).map(id => {
                        const p = personnel.find(per => per.id === id);
                        return p ? (
                          <Badge key={id} variant="outline" className="text-xs">
                            {p.name}
                            <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => toggleIndividual(id)} />
                          </Badge>
                        ) : null;
                      })}
                      {selectedIndividuals.length > 5 && (
                        <Badge variant="outline" className="text-xs">
                          +{selectedIndividuals.length - 5} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleDownloadPdfs}
              className="flex-1 gap-2"
              disabled={!canDownload() || isBundleGenerating}
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
              disabled={!canDownload() || isBundleGenerating}
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
