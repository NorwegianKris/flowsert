import { useState, useEffect, useRef, useCallback } from 'react';
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
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/StatusBadge';
import { Certificate } from '@/types';
import {
  getCertificateStatus,
  getDaysUntilExpiry,
  formatExpiryText,
} from '@/lib/certificateUtils';
import { getCertificateDocumentUrl, downloadAsBlob, extractStoragePath } from '@/lib/storageUtils';
import { fileToBase64Image } from '@/lib/pdfUtils';
import { stringSimilarity } from '@/lib/stringUtils';
import { format, parseISO } from 'date-fns';
import { FileText, Award, Calendar, MapPin, Building2, ExternalLink, Image, File, Tag, Pencil, Loader2, Lock, Download, RotateCcw, RotateCw, ZoomIn, ZoomOut, RefreshCw, CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react';
import { EditCertificateDialog } from './EditCertificateDialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PdfViewer } from './PdfViewer';
import { supabase } from '@/integrations/supabase/client';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

type RowScanStatus = 'scanning' | 'success' | 'error' | 'reclassify';

interface CertificateTableProps {
  certificates: Certificate[];
  onCertificateUpdated?: () => void;
  isProfileActivated?: boolean;
}

export function CertificateTable({ certificates, onCertificateUpdated, isProfileActivated = true }: CertificateTableProps) {
  const [selectedCertificate, setSelectedCertificate] = useState<Certificate | null>(null);
  const [editCertificate, setEditCertificate] = useState<Certificate | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [downloadError, setDownloadError] = useState(false);
  const [imgRotation, setImgRotation] = useState(0);
  const [imgZoom, setImgZoom] = useState(1);
  const [rowScanStatus, setRowScanStatus] = useState<Record<string, RowScanStatus>>({});
  const timeoutRefs = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const queryClient = useQueryClient();
  const { businessId } = useAuth();

  // Reset image controls when certificate changes
  useEffect(() => {
    setImgRotation(0);
    setImgZoom(1);
  }, [selectedCertificate?.id]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(timeoutRefs.current).forEach(clearTimeout);
    };
  }, []);
  
  const canAccessDocuments = isProfileActivated;

  const sortedCertificates = [...certificates].sort((a, b) => {
    const statusOrder = { expired: 0, expiring: 1, valid: 2 };
    const statusA = getCertificateStatus(a.expiryDate);
    const statusB = getCertificateStatus(b.expiryDate);
    return statusOrder[statusA] - statusOrder[statusB];
  });

  const isImageFile = (url: string) => {
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
  };

  const isPdfFile = (url: string) => {
    return /\.pdf$/i.test(url);
  };

  const handleEditClick = (e: React.MouseEvent, cert: Certificate) => {
    e.stopPropagation();
    setEditCertificate(cert);
  };

  const setRowStatus = useCallback((certId: string, status: RowScanStatus | null) => {
    if (status === null) {
      setRowScanStatus(prev => {
        const next = { ...prev };
        delete next[certId];
        return next;
      });
    } else {
      setRowScanStatus(prev => ({ ...prev, [certId]: status }));
    }
  }, []);

  const handleRescan = useCallback(async (cert: Certificate) => {
    if (!cert.documentUrl) {
      toast.error('Could not load document');
      return;
    }

    setRowStatus(cert.id, 'scanning');

    try {
      // 1. Download document from storage
      const filePath = extractStoragePath(cert.documentUrl, 'certificate-documents');
      const { data: fileData, error: dlError } = await supabase.storage
        .from('certificate-documents')
        .download(filePath);

      if (dlError || !fileData) {
        throw new Error('download_failed');
      }

      // 2. Convert to base64
      const fileName = filePath.split('/').pop() || 'document';
      const file = new window.File([fileData], fileName, { type: fileData.type });
      const { base64, mimeType } = await fileToBase64Image(file);

      // 3. Call extract-certificate-data edge function
      const { data: extractResult, error: fnError } = await supabase.functions.invoke('extract-certificate-data', {
        body: { imageBase64: base64, mimeType, existingCategories: [], existingIssuers: [] },
      });

      if (fnError) throw new Error('extraction_failed');

      const newTitle = extractResult?.extractedData?.certificateName;
      if (!newTitle) throw new Error('extraction_failed');

      // 4. Save rollback data
      const rollbackKey = `rescan_individual_${Date.now()}`;
      const existingRollback = (await supabase
        .from('certificates')
        .select('rescan_previous_data')
        .eq('id', cert.id)
        .single())?.data?.rescan_previous_data as Record<string, unknown> | null;

      const rollbackData = {
        ...(existingRollback || {}),
        [rollbackKey]: {
          title_raw: cert.titleRaw,
          certificate_type_id: cert.certificateTypeId,
        },
      };

      // 5. Compare new title against current type name
      const currentTypeName = cert.titleRaw || cert.name || '';
      const similarity = stringSimilarity(newTitle, currentTypeName);

      if (similarity >= 0.85) {
        // Outcome A — verified
        await supabase.from('certificates').update({ rescan_previous_data: rollbackData as any }).eq('id', cert.id);
        setRowStatus(cert.id, 'success');
        toast.success('Document verified — title confirmed');
        timeoutRefs.current[cert.id] = setTimeout(() => setRowStatus(cert.id, null), 2000);
      } else if (similarity >= 0.5) {
        // Outcome B — title updated, type kept
        await supabase.from('certificates').update({
          title_raw: newTitle,
          rescan_previous_data: rollbackData as any,
        }).eq('id', cert.id);
        setRowStatus(cert.id, null);
        toast.success(`Title updated to "${newTitle}"`);
      } else {
        // Outcome C — significant change, unassign type
        await supabase.from('certificates').update({
          title_raw: newTitle,
          certificate_type_id: null,
          category_id: null,
          rescan_previous_data: rollbackData as any,
        }).eq('id', cert.id);
        setRowStatus(cert.id, 'reclassify');
        toast.warning(`Title changed to "${newTitle}" — moved to triage for re-classification`);
      }

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['certificates'] });
      queryClient.invalidateQueries({ queryKey: ['unmapped-certificates'] });
      queryClient.invalidateQueries({ queryKey: ['needs-review-count'] });
      onCertificateUpdated?.();
    } catch (err: any) {
      const msg = err?.message === 'download_failed'
        ? 'Could not load document'
        : 'Re-scan failed — try again';
      setRowStatus(cert.id, 'error');
      toast.error(msg);
      timeoutRefs.current[cert.id] = setTimeout(() => setRowStatus(cert.id, null), 2000);
    }
  }, [businessId, queryClient, onCertificateUpdated, setRowStatus]);

  // Load PDF data and signed URL when certificate is selected (only if activated)
  useEffect(() => {
    if (selectedCertificate?.documentUrl && canAccessDocuments) {
      setLoadingUrl(true);
      setDownloadError(false);
      setBlobUrl(null);
      setPdfData(null);
      
      getCertificateDocumentUrl(selectedCertificate.documentUrl)
        .then(url => setSignedUrl(url));
      
      const path = selectedCertificate.documentUrl.includes('certificate-documents/')
        ? selectedCertificate.documentUrl.match(/certificate-documents\/(.+)/)?.[1] || selectedCertificate.documentUrl
        : selectedCertificate.documentUrl;
      
      supabase.storage
        .from('certificate-documents')
        .download(path)
        .then(({ data, error }) => {
          if (error) {
            console.error('Error downloading file:', error);
            setDownloadError(true);
            return;
          }
          if (data) {
            setBlobUrl(URL.createObjectURL(data));
            if (isPdfFile(selectedCertificate.documentUrl || '')) {
              data.arrayBuffer().then(buffer => {
                setPdfData(buffer);
              });
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
  }, [selectedCertificate?.documentUrl, canAccessDocuments]);

  const handleOpenDocument = async (documentUrl: string, download = false) => {
    if (!canAccessDocuments) return;
    
    const path = documentUrl.includes('certificate-documents/')
      ? documentUrl.match(/certificate-documents\/(.+)/)?.[1] || documentUrl
      : documentUrl;
    
    const result = await downloadAsBlob('certificate-documents', path);
    if (result) {
      const link = document.createElement('a');
      link.href = result.blobUrl;
      
      if (download) {
        const filename = path.split('/').pop() || 'document';
        link.download = filename;
      } else {
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
      }
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setTimeout(() => result.revoke(), 60000);
      return;
    }
    
    const url = await getCertificateDocumentUrl(documentUrl);
    if (url) {
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const displayUrl = blobUrl || signedUrl;

  const renderRescanIcon = (cert: Certificate) => {
    const status = rowScanStatus[cert.id];

    if (status === 'success') {
      return <CheckCircle className="h-3.5 w-3.5 text-green-500 transition-opacity" />;
    }
    if (status === 'error') {
      return <AlertCircle className="h-3.5 w-3.5 text-destructive transition-opacity" />;
    }
    if (status === 'scanning') {
      return <RefreshCw className="h-3.5 w-3.5 text-muted-foreground animate-spin" />;
    }

    return (
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <RefreshCw
              className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                handleRescan(cert);
              }}
            />
          </TooltipTrigger>
          <TooltipContent side="top">Re-scan with AI</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  return (
    <>
      <div className="rounded-lg border border-border/50 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-primary hover:bg-primary">
              <TableHead className="font-semibold text-white">Certificate Type</TableHead>
              <TableHead className="font-semibold text-white">Status</TableHead>
              <TableHead className="font-semibold text-white">Category</TableHead>
              <TableHead className="font-semibold text-white">Issuing Authority</TableHead>
              <TableHead className="font-semibold text-white">Date of Issue</TableHead>
              <TableHead className="font-semibold text-white">Expiry Date</TableHead>
              <TableHead className="font-semibold text-white">Place of Issue</TableHead>
              <TableHead className="font-semibold text-white">Document</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedCertificates.map((cert) => {
              const status = getCertificateStatus(cert.expiryDate);
              const daysUntilExpiry = getDaysUntilExpiry(cert.expiryDate);
              const scanStatus = rowScanStatus[cert.id];

              return (
                <TableRow 
                  key={cert.id} 
                  className={`group cursor-pointer hover:bg-muted/50 transition-colors ${scanStatus === 'scanning' ? 'bg-primary/5' : ''}`}
                  onClick={() => setSelectedCertificate(cert)}
                >
                  <TableCell>
                    {scanStatus === 'reclassify' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 text-xs font-medium">
                        <AlertTriangle className="h-3 w-3" />
                        Re-classify
                      </span>
                    ) : cert.titleRaw ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-xs font-medium">
                        <Award className="h-3 w-3" />
                        {cert.titleRaw}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">Untyped</span>
                    )}
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
                  <TableCell className="text-muted-foreground">
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
                  <TableCell className="text-muted-foreground">
                    {cert.placeOfIssue}
                  </TableCell>
                  <TableCell>
                    {cert.documentUrl ? (
                      <div className="flex items-center gap-1.5">
                        {renderRescanIcon(cert)}
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
              {/* Document Preview */}
              {selectedCertificate.documentUrl ? (
                <div className="border rounded-lg overflow-hidden bg-muted/20">
                  <div className="p-3 border-b bg-muted/30 flex items-center justify-between">
                    <span className="text-sm font-medium">Document Preview</span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedCertificate(null);
                          setEditCertificate(selectedCertificate);
                        }}
                      >
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      {canAccessDocuments && selectedCertificate.documentUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDocument(selectedCertificate.documentUrl!, true)}
                          disabled={!displayUrl || loadingUrl}
                        >
                          {loadingUrl ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <ExternalLink className="h-4 w-4 mr-2" />
                          )}
                          Download
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="p-4 flex justify-center">
                    {!canAccessDocuments ? (
                      <div className="flex flex-col items-center gap-4 py-8 text-center">
                        <div className="p-4 rounded-full bg-amber-100 dark:bg-amber-900/30">
                          <Lock className="h-12 w-12 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div className="space-y-2">
                          <p className="font-medium text-foreground">Document Access Locked</p>
                          <p className="text-sm text-muted-foreground max-w-sm">
                            Activate this profile to view and download certificate documents. 
                            Activated profiles count toward billing.
                          </p>
                        </div>
                      </div>
                    ) : loadingUrl ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : downloadError ? (
                      <div className="flex flex-col items-center gap-4 py-8 text-center">
                        <div className="p-4 rounded-full bg-destructive/10">
                          <File className="h-12 w-12 text-destructive" />
                        </div>
                        <div className="space-y-2">
                          <p className="font-medium text-foreground">Could not load document</p>
                          <p className="text-sm text-muted-foreground max-w-sm">
                            The document could not be retrieved. This may be a temporary issue.
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setDownloadError(false);
                            setLoadingUrl(true);
                            setBlobUrl(null);
                            setPdfData(null);
                            const path = selectedCertificate.documentUrl!.includes('certificate-documents/')
                              ? selectedCertificate.documentUrl!.match(/certificate-documents\/(.+)/)?.[1] || selectedCertificate.documentUrl!
                              : selectedCertificate.documentUrl!;
                            supabase.storage.from('certificate-documents').download(path)
                              .then(({ data, error }) => {
                                if (error) { setDownloadError(true); return; }
                                if (data) {
                                  setBlobUrl(URL.createObjectURL(data));
                                  if (isPdfFile(selectedCertificate.documentUrl || '')) {
                                    data.arrayBuffer().then(buffer => setPdfData(buffer));
                                  }
                                }
                              })
                              .finally(() => setLoadingUrl(false));
                          }}
                        >
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Retry
                        </Button>
                      </div>
                    ) : displayUrl && isImageFile(selectedCertificate.documentUrl) ? (
                      <div className="w-full">
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
                      <div className="flex flex-col gap-4 w-full">
                        <PdfViewer pdfData={pdfData} />
                        <div className="flex justify-center">
                          <Button
                            variant="outline"
                            onClick={() => handleOpenDocument(selectedCertificate.documentUrl!, true)}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download PDF
                          </Button>
                        </div>
                      </div>
                    ) : displayUrl && isPdfFile(selectedCertificate.documentUrl) ? (
                      <div className="flex flex-col items-center gap-4 py-8">
                        <File className="h-16 w-16 text-primary" />
                        <p className="text-muted-foreground">PDF loading...</p>
                        <Button
                          variant="outline"
                          onClick={() => handleOpenDocument(selectedCertificate.documentUrl!, true)}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download PDF
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-4 py-8">
                        <File className="h-16 w-16 text-muted-foreground" />
                        <p className="text-muted-foreground">Document available</p>
                        <Button
                          variant="outline"
                          onClick={() => handleOpenDocument(selectedCertificate.documentUrl!, true)}
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
                <div className="bg-gradient-to-br from-primary/5 to-primary/10 border-2 border-primary/20 rounded-lg p-8 relative overflow-hidden">
                  <div className="absolute top-4 right-4 opacity-10">
                    <Award className="h-24 w-24 text-primary" />
                  </div>
                  
                  <div className="absolute top-4 left-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedCertificate(null);
                        setEditCertificate(selectedCertificate);
                      }}
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  </div>
                  
                  <div className="text-center space-y-4 relative z-10 mt-8">
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
                
                <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/30 col-span-2">
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

      <EditCertificateDialog
        open={!!editCertificate}
        onOpenChange={(open) => !open && setEditCertificate(null)}
        certificate={editCertificate}
        onSuccess={() => {
          setEditCertificate(null);
          onCertificateUpdated?.();
        }}
      />
    </>
  );
}
