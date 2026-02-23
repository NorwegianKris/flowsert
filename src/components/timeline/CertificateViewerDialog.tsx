import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { StatusBadge } from '@/components/StatusBadge';
import { PdfViewer } from '@/components/PdfViewer';
import { getCertificateStatus } from '@/lib/certificateUtils';
import { getCertificateDocumentUrl, downloadAsBlob } from '@/lib/storageUtils';
import { supabase } from '@/integrations/supabase/client';
import {
  Award, Calendar, MapPin, Building2, Tag, User, File,
  Loader2, RotateCcw, RotateCw, ZoomIn, ZoomOut, Download,
} from 'lucide-react';
import { TimelineEvent } from './types';

interface CertificateViewerDialogProps {
  event: TimelineEvent | null;
  onClose: () => void;
}

export function CertificateViewerDialog({ event, onClose }: CertificateViewerDialogProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [downloadError, setDownloadError] = useState(false);
  const [imgRotation, setImgRotation] = useState(0);
  const [imgZoom, setImgZoom] = useState(1);

  // Reset controls on event change
  useEffect(() => {
    setImgRotation(0);
    setImgZoom(1);
  }, [event?.id]);

  // Load document
  useEffect(() => {
    if (!event?.documentUrl) {
      setSignedUrl(null);
      setBlobUrl(null);
      setPdfData(null);
      return;
    }

    setLoadingUrl(true);
    setDownloadError(false);
    setBlobUrl(null);
    setPdfData(null);

    getCertificateDocumentUrl(event.documentUrl).then(url => setSignedUrl(url));

    const path = event.documentUrl.includes('certificate-documents/')
      ? event.documentUrl.match(/certificate-documents\/(.+)/)?.[1] || event.documentUrl
      : event.documentUrl;

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
          if (isPdfFile(event.documentUrl || '')) {
            data.arrayBuffer().then(buffer => setPdfData(buffer));
          }
        }
      })
      .finally(() => setLoadingUrl(false));

    return () => {
      // cleanup handled by close
    };
  }, [event?.documentUrl]);

  // Cleanup blob on unmount / close
  useEffect(() => {
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [blobUrl]);

  const handleDownload = async () => {
    if (!event?.documentUrl) return;
    const path = event.documentUrl.includes('certificate-documents/')
      ? event.documentUrl.match(/certificate-documents\/(.+)/)?.[1] || event.documentUrl
      : event.documentUrl;

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
    if (signedUrl) window.open(signedUrl, '_blank');
  };

  const isImageFile = (url: string) => /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
  const isPdfFile = (url: string) => /\.pdf$/i.test(url);

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const displayUrl = blobUrl || signedUrl;
  const expiryStr = event ? format(event.expiryDate, 'yyyy-MM-dd') : null;

  return (
    <Dialog open={!!event} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            Certificate Details
          </DialogTitle>
        </DialogHeader>

        {event && (
          <div className="space-y-6">
            {/* Personnel Info */}
            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/30 border border-border/50">
              <Avatar className="h-12 w-12">
                <AvatarImage src={event.personnelAvatarUrl ?? undefined} alt={event.personnelName} />
                <AvatarFallback className="text-sm font-medium">
                  {getInitials(event.personnelName)}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">Certificate Holder</span>
                </div>
                <p className="font-semibold text-foreground">{event.personnelName}</p>
                {event.personnelRole && (
                  <p className="text-sm text-muted-foreground">{event.personnelRole}</p>
                )}
              </div>
            </div>

            {/* Document Preview */}
            {event.documentUrl ? (
              <div className="border rounded-lg overflow-hidden bg-muted/20">
                <div className="p-3 border-b bg-muted/30 flex items-center justify-between">
                  <span className="text-sm font-medium">Document Preview</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownload}
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
                          const path = event.documentUrl!.includes('certificate-documents/')
                            ? event.documentUrl!.match(/certificate-documents\/(.+)/)?.[1] || event.documentUrl!
                            : event.documentUrl!;
                          supabase.storage.from('certificate-documents').download(path)
                            .then(({ data, error: err }) => {
                              if (err) { setDownloadError(true); return; }
                              if (data) {
                                setBlobUrl(URL.createObjectURL(data));
                                if (isPdfFile(event.documentUrl || '')) {
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
                  ) : displayUrl && isImageFile(event.documentUrl) ? (
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
                            alt={`${event.certificateName} document`}
                            className="object-contain rounded transition-transform"
                            style={{
                              transform: `rotate(${imgRotation}deg) scale(${imgZoom})`,
                              maxHeight: imgRotation % 180 !== 0 ? '600px' : '400px',
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ) : pdfData && isPdfFile(event.documentUrl) ? (
                    <div className="w-full">
                      <PdfViewer pdfData={pdfData} />
                    </div>
                  ) : displayUrl && isPdfFile(event.documentUrl) ? (
                    <div className="flex flex-col items-center gap-4 py-8">
                      <File className="h-16 w-16 text-primary" />
                      <p className="text-muted-foreground">PDF loading...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-4 py-8">
                      <File className="h-16 w-16 text-muted-foreground" />
                      <p className="text-muted-foreground">Document available</p>
                      <Button variant="outline" onClick={handleDownload} disabled={!displayUrl && !blobUrl}>
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
                <div className="text-center space-y-4 relative z-10">
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">
                    Certificate of Competency
                  </div>
                  <h2 className="text-2xl font-bold text-foreground">{event.certificateName}</h2>
                  <div className="w-24 h-0.5 bg-primary/30 mx-auto" />
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    No document uploaded for this certificate.
                  </p>
                </div>
              </div>
            )}

            {/* Certificate Details Grid */}
            <div className="grid grid-cols-2 gap-4">
              {event.dateOfIssue && (
                <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/30">
                  <Calendar className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">Date of Issue</div>
                    <div className="font-medium">{format(new Date(event.dateOfIssue), 'dd MMMM yyyy')}</div>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/30">
                <Calendar className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">Expiry Date</div>
                  <div className="font-medium">{format(event.expiryDate, 'dd MMMM yyyy')}</div>
                </div>
              </div>

              {event.placeOfIssue && (
                <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/30">
                  <MapPin className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">Place of Issue</div>
                    <div className="font-medium">{event.placeOfIssue}</div>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/30">
                <Tag className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">Category</div>
                  <div className="font-medium">{event.categoryName || 'Uncategorized'}</div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/30">
                <Building2 className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">Issuing Authority</div>
                  <div className="font-medium">{event.issuingAuthority || 'Not specified'}</div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/30">
                <Award className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">Status</div>
                  <StatusBadge status={expiryStr ? getCertificateStatus(expiryStr) : 'valid'} showLabel />
                </div>
              </div>
            </div>

            {/* Certificate ID */}
            <div className="text-center text-xs text-muted-foreground border-t pt-4">
              Certificate ID: {event.id}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
