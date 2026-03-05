import { useState, useEffect, useRef, useMemo } from 'react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { StatusBadge } from '@/components/StatusBadge';
import { Certificate, Personnel } from '@/types';
import {
  getCertificateStatus,
  getDaysUntilExpiry,
  formatExpiryText,
} from '@/lib/certificateUtils';
import { getCertificateDocumentUrl, downloadAsBlob } from '@/lib/storageUtils';
import { format, parseISO } from 'date-fns';
import { FileText, Award, Calendar, MapPin, Building2, Image, File, Tag, ShieldAlert, User, Loader2, RotateCcw, RotateCw, ZoomIn, ZoomOut, Download, ChevronDown } from 'lucide-react';
import { PdfViewer } from './PdfViewer';
import { supabase } from '@/integrations/supabase/client';

interface CertificateWithPersonnel extends Certificate {
  personnelId: string;
  personnelName: string;
  personnelAvatarUrl?: string;
  personnelRole: string;
}

interface ProjectCertificateStatusProps {
  personnel: Personnel[];
  highlightedCertificateId?: string | null;
  onClearHighlight?: () => void;
}

export function ProjectCertificateStatus({ personnel, highlightedCertificateId, onClearHighlight }: ProjectCertificateStatusProps) {
  const [selectedCertificate, setSelectedCertificate] = useState<CertificateWithPersonnel | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [imgRotation, setImgRotation] = useState(0);
  const [imgZoom, setImgZoom] = useState(1);
  const [isOpen, setIsOpen] = useState(false);
  const [filterPersonnel, setFilterPersonnel] = useState<string>('all');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const highlightedRowRef = useRef<HTMLTableRowElement>(null);

  // Auto-expand collapsible when a certificate is highlighted from the timeline
  useEffect(() => {
    if (highlightedCertificateId) {
      setIsOpen(true);
    }
  }, [highlightedCertificateId]);

  // Auto-clear highlight after 3 seconds
  useEffect(() => {
    if (!highlightedCertificateId) return;
    const timer = setTimeout(() => onClearHighlight?.(), 3000);
    return () => clearTimeout(timer);
  }, [highlightedCertificateId, onClearHighlight]);

  // Scroll highlighted row into view
  useEffect(() => {
    if (highlightedCertificateId && highlightedRowRef.current) {
      highlightedRowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightedCertificateId]);

  // Reset image controls when certificate changes
  useEffect(() => {
    setImgRotation(0);
    setImgZoom(1);
  }, [selectedCertificate?.id]);

  // Load document data when certificate is selected
  useEffect(() => {
    if (selectedCertificate?.documentUrl) {
      setLoadingUrl(true);
      setBlobUrl(null);
      setPdfData(null);

      // Load signed URL for fallback/download
      getCertificateDocumentUrl(selectedCertificate.documentUrl)
        .then(url => setSignedUrl(url));

      // Extract file path
      const path = selectedCertificate.documentUrl.includes('certificate-documents/')
        ? selectedCertificate.documentUrl.match(/certificate-documents\/(.+)/)?.[1] || selectedCertificate.documentUrl
        : selectedCertificate.documentUrl;

      // Download file directly via SDK (bypasses ad blockers)
      supabase.storage
        .from('certificate-documents')
        .download(path)
        .then(({ data, error }) => {
          if (error) {
            console.error('Error downloading file:', error);
            return;
          }
          if (data) {
            setBlobUrl(URL.createObjectURL(data));
            if (isPdfFile(selectedCertificate.documentUrl || '')) {
              data.arrayBuffer().then(buffer => setPdfData(buffer));
            }
          }
        })
        .finally(() => setLoadingUrl(false));
    } else {
      setSignedUrl(null);
      setBlobUrl(null);
      setPdfData(null);
    }

    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [selectedCertificate?.documentUrl]);

  const handleDownloadDocument = async () => {
    if (!selectedCertificate?.documentUrl) return;
    const path = selectedCertificate.documentUrl.includes('certificate-documents/')
      ? selectedCertificate.documentUrl.match(/certificate-documents\/(.+)/)?.[1] || selectedCertificate.documentUrl
      : selectedCertificate.documentUrl;

    const result = await downloadAsBlob('certificate-documents', path);
    if (result) {
      const link = document.createElement('a');
      link.href = result.blobUrl;
      link.download = path.split('/').pop() || 'document';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => result.revoke(), 60000);
      return;
    }
    // Fallback
    if (signedUrl) window.open(signedUrl, '_blank');
  };

  const displayUrl = blobUrl || signedUrl;

  // Collect all certificates from assigned personnel with personnel info
  const allCertificates: CertificateWithPersonnel[] = personnel.flatMap((person) =>
    person.certificates.map((cert) => ({
      ...cert,
      personnelId: person.id,
      personnelName: person.name,
      personnelAvatarUrl: person.avatarUrl,
      personnelRole: person.role,
    }))
  );

  // Sort by expiry date (soonest first, null/no expiry at the end)
  const sortedCertificates = [...allCertificates].sort((a, b) => {
    if (!a.expiryDate && !b.expiryDate) return 0;
    if (!a.expiryDate) return 1;
    if (!b.expiryDate) return -1;
    return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
  });

  // Derive unique personnel and roles for filter dropdowns
  const uniquePersonnel = useMemo(() => {
    const seen = new Map<string, string>();
    allCertificates.forEach(c => seen.set(c.personnelId, c.personnelName));
    return Array.from(seen.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [allCertificates]);

  const uniqueRoles = useMemo(() => {
    const roles = new Set(allCertificates.map(c => c.personnelRole));
    return Array.from(roles).sort();
  }, [allCertificates]);

  // Apply filters
  const filteredCertificates = useMemo(() => {
    return sortedCertificates.filter(cert => {
      if (filterPersonnel !== 'all' && cert.personnelId !== filterPersonnel) return false;
      if (filterRole !== 'all' && cert.personnelRole !== filterRole) return false;
      if (filterStatus !== 'all') {
        const status = getCertificateStatus(cert.expiryDate);
        if (filterStatus === 'valid' && status !== 'valid') return false;
        if (filterStatus === 'expiring' && status !== 'expiring') return false;
        if (filterStatus === 'expired' && status !== 'expired') return false;
      }
      return true;
    });
  }, [sortedCertificates, filterPersonnel, filterRole, filterStatus]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const isImageFile = (url: string) => {
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
  };

  const isPdfFile = (url: string) => {
    return /\.pdf$/i.test(url);
  };

  if (sortedCertificates.length === 0) {
    return (
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-primary" />
            Certificate Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="text-4xl mb-3">🏅</div>
            <p className="text-muted-foreground text-sm">
              No certificates found for assigned personnel
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Collapsible>
      <Card className="border-border/50">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-primary" />
              Certificate Status ({sortedCertificates.length})
              <ChevronDown className="h-4 w-4 ml-auto transition-transform duration-200 [[data-state=closed]_&]:rotate-[-90deg]" />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
        <CardContent>
          <div className="rounded-lg border border-border/50 overflow-hidden max-h-[600px] overflow-y-auto">
            <Table className="w-full table-fixed">
              <TableHeader className="sticky top-0 z-10">
                <TableRow className="bg-primary hover:bg-primary">
                  <TableHead className="w-[16%] font-semibold text-white">Personnel</TableHead>
                  <TableHead className="w-[14%] font-semibold text-white">Certificate</TableHead>
                  <TableHead className="w-[10%] font-semibold text-white">Status</TableHead>
                  <TableHead className="w-[10%] font-semibold text-white">Category</TableHead>
                  <TableHead className="w-[13%] font-semibold text-white">Issuing Authority</TableHead>
                  <TableHead className="w-[10%] font-semibold text-white">Date of Issue</TableHead>
                  <TableHead className="w-[10%] font-semibold text-white">Expiry Date</TableHead>
                  <TableHead className="w-[8%] font-semibold text-white">Place of Issue</TableHead>
                  <TableHead className="w-[9%] font-semibold text-white">Document</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedCertificates.map((cert) => {
                  const status = getCertificateStatus(cert.expiryDate);
                  const daysUntilExpiry = getDaysUntilExpiry(cert.expiryDate);

                    const isHighlighted = highlightedCertificateId === cert.id;

                  return (
                    <TableRow 
                      key={`${cert.personnelId}-${cert.id}`}
                      ref={isHighlighted ? highlightedRowRef : undefined}
                      className={`group cursor-pointer hover:bg-muted/50 transition-all ${isHighlighted ? 'ring-2 ring-primary shadow-md' : ''}`}
                      onClick={() => setSelectedCertificate(cert)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={cert.personnelAvatarUrl} alt={cert.personnelName} />
                            <AvatarFallback className="text-xs font-medium">
                              {getInitials(cert.personnelName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{cert.personnelName}</p>
                            <p className="text-xs text-muted-foreground truncate">{cert.personnelRole}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="font-medium truncate">{cert.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <StatusBadge status={status} showLabel />
                          <span className="text-xs text-muted-foreground">
                            {formatExpiryText(daysUntilExpiry)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {cert.category ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                            <Tag className="h-3 w-3" />
                            {cert.category}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Uncategorized</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground truncate">
                        {cert.issuingAuthority || <span className="italic">Not specified</span>}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(parseISO(cert.dateOfIssue), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell>
                        {cert.expiryDate ? (
                          <span
                            className={
                              status === 'expired'
                                ? 'text-destructive font-medium'
                                : status === 'expiring'
                                ? 'text-[hsl(var(--status-warning))] font-medium'
                                : 'text-muted-foreground'
                            }
                          >
                            {format(parseISO(cert.expiryDate), 'dd MMM yyyy')}
                          </span>
                        ) : (
                          <span className="text-muted-foreground italic">No expiry</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground truncate">
                        {cert.placeOfIssue}
                      </TableCell>
                      <TableCell>
                        {cert.documentUrl ? (
                          <div className="flex items-center gap-1">
                            {isImageFile(cert.documentUrl) ? (
                              <Image className="h-4 w-4 text-primary" />
                            ) : (
                              <File className="h-4 w-4 text-primary" />
                            )}
                            <span className="text-xs text-primary">Attached</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">None</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        </CollapsibleContent>
      </Card>
      </Collapsible>

      <Dialog open={!!selectedCertificate} onOpenChange={(open) => !open && setSelectedCertificate(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              Certificate Details
            </DialogTitle>
          </DialogHeader>
          
          {selectedCertificate && (
            <div className="space-y-6">
              {/* Personnel Info */}
              <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/30 border border-border/50">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={selectedCertificate.personnelAvatarUrl} alt={selectedCertificate.personnelName} />
                  <AvatarFallback className="text-sm font-medium">
                    {getInitials(selectedCertificate.personnelName)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    <span className="text-xs text-muted-foreground uppercase tracking-wide">Certificate Holder</span>
                  </div>
                  <p className="font-semibold text-foreground">{selectedCertificate.personnelName}</p>
                  <p className="text-sm text-muted-foreground">{selectedCertificate.personnelRole}</p>
                </div>
              </div>

              {/* Document Preview */}
              {selectedCertificate.documentUrl ? (
                <div className="border rounded-lg overflow-hidden bg-muted/20">
                  <div className="p-3 border-b bg-muted/30 flex items-center justify-between">
                    <span className="text-sm font-medium">Document Preview</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadDocument}
                      disabled={(!displayUrl && !blobUrl) || loadingUrl}
                    >
                      {loadingUrl ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4 mr-2" />
                      )}
                      Download
                    </Button>
                  </div>
                  <div className="p-4 flex justify-center">
                    {loadingUrl ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : displayUrl && isImageFile(selectedCertificate.documentUrl) ? (
                      <div className="w-full">
                        {/* Image controls */}
                        <div className="flex items-center justify-center gap-1 mb-3">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setImgRotation(prev => (prev - 90 + 360) % 360)} title="Rotate left">
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setImgRotation(prev => (prev + 90) % 360)} title="Rotate right">
                            <RotateCw className="h-4 w-4" />
                          </Button>
                          <div className="w-px h-5 bg-border mx-1" />
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setImgZoom(prev => Math.max(prev - 0.2, 0.5))} disabled={imgZoom <= 0.5}>
                            <ZoomOut className="h-4 w-4" />
                          </Button>
                          <span className="text-sm text-muted-foreground px-2 min-w-[3rem] text-center">{Math.round(imgZoom * 100)}%</span>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setImgZoom(prev => Math.min(prev + 0.2, 3))} disabled={imgZoom >= 3}>
                            <ZoomIn className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="overflow-auto max-h-[450px] border rounded-lg bg-muted/10">
                          <div className="flex justify-center p-4">
                            <img
                              src={displayUrl}
                              alt={`${selectedCertificate.name} document`}
                              className="object-contain rounded transition-transform"
                              style={{
                                transform: `rotate(${imgRotation}deg) scale(${imgZoom})`,
                                maxHeight: imgRotation % 180 !== 0 ? '600px' : '400px',
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ) : pdfData && isPdfFile(selectedCertificate.documentUrl) ? (
                      <div className="w-full">
                        <PdfViewer pdfData={pdfData} />
                      </div>
                    ) : displayUrl && isPdfFile(selectedCertificate.documentUrl) ? (
                      <div className="flex flex-col items-center gap-4 py-8">
                        <File className="h-16 w-16 text-primary" />
                        <p className="text-muted-foreground">PDF loading...</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-4 py-8">
                        <File className="h-16 w-16 text-muted-foreground" />
                        <p className="text-muted-foreground">Document available</p>
                        <Button
                          variant="outline"
                          onClick={handleDownloadDocument}
                          disabled={!displayUrl && !blobUrl}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download Document
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Certificate Placeholder when no document */
                <div className="bg-gradient-to-br from-primary/5 to-primary/10 border-2 border-primary/20 rounded-lg p-8 relative overflow-hidden">
                  <div className="absolute top-4 right-4 opacity-10">
                    <Award className="h-24 w-24 text-primary" />
                  </div>
                  
                  <div className="text-center space-y-4 relative z-10">
                    <div className="text-xs uppercase tracking-widest text-muted-foreground">
                      Certificate of Competency
                    </div>
                    <h2 className="text-2xl font-bold text-foreground">
                      {selectedCertificate.name}
                    </h2>
                    <div className="w-24 h-0.5 bg-primary/30 mx-auto" />
                    <p className="text-sm text-muted-foreground max-w-md mx-auto">
                      No document uploaded for this certificate.
                    </p>
                  </div>
                </div>
              )}

              {/* Certificate Details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/30">
                  <Calendar className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">Date of Issue</div>
                    <div className="font-medium">
                      {format(parseISO(selectedCertificate.dateOfIssue), 'dd MMMM yyyy')}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/30">
                  <Calendar className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">Expiry Date</div>
                    <div className="font-medium">
                      {selectedCertificate.expiryDate 
                        ? format(parseISO(selectedCertificate.expiryDate), 'dd MMMM yyyy')
                        : 'No expiry'}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/30">
                  <MapPin className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">Place of Issue</div>
                    <div className="font-medium">{selectedCertificate.placeOfIssue}</div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/30">
                  <Tag className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">Category</div>
                    <div className="font-medium">{selectedCertificate.category || 'Uncategorized'}</div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/30">
                  <Building2 className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">Issuing Authority</div>
                    <div className="font-medium">{selectedCertificate.issuingAuthority || 'Not specified'}</div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/30">
                  <Award className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">Status</div>
                    <StatusBadge status={getCertificateStatus(selectedCertificate.expiryDate)} showLabel />
                  </div>
                </div>
              </div>

              {/* Certificate ID */}
              <div className="text-center text-xs text-muted-foreground border-t pt-4">
                Certificate ID: {selectedCertificate.id}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
