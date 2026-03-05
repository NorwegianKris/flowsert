import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PdfViewer } from '@/components/PdfViewer';
import { downloadAsBlob } from '@/lib/storageUtils';
import { supabase } from '@/integrations/supabase/client';
import {
  Award, Calendar, MapPin, Building2, Tag, User, File,
  Loader2, RotateCcw, RotateCw, ZoomIn, ZoomOut, Download, FileText,
} from 'lucide-react';
import { format } from 'date-fns';

export interface DocumentPreviewMetadata {
  personnelName?: string;
  dateOfIssue?: string | null;
  expiryDate?: string | null;
  placeOfIssue?: string | null;
  issuingAuthority?: string | null;
  category?: string | null;
}

interface DocumentPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Relative storage path or legacy full URL within certificate-documents bucket */
  documentUrl: string | null;
  /** Display title for the dialog header */
  title?: string;
  /** Optional bucket name, defaults to 'certificate-documents' */
  bucket?: string;
  /** Optional metadata to show certificate info header */
  metadata?: DocumentPreviewMetadata;
}

const isImageFile = (url: string) => /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
const isPdfFile = (url: string) => /\.pdf$/i.test(url);

function extractPath(url: string, bucket: string): string {
  if (url.includes(`${bucket}/`)) {
    const match = url.match(new RegExp(`${bucket}/(.+)`));
    if (match) return match[1];
  }
  return url;
}

export function DocumentPreviewDialog({
  open,
  onOpenChange,
  documentUrl,
  title = 'Document',
  bucket = 'certificate-documents',
  metadata,
}: DocumentPreviewDialogProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [imgRotation, setImgRotation] = useState(0);
  const [imgZoom, setImgZoom] = useState(1);

  const cleanup = useCallback(() => {
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    setBlobUrl(null);
    setPdfData(null);
    setError(false);
    setImgRotation(0);
    setImgZoom(1);
  }, [blobUrl]);

  const loadDocument = useCallback(async (url: string) => {
    setLoading(true);
    setError(false);
    setBlobUrl(null);
    setPdfData(null);

    const path = extractPath(url, bucket);

    try {
      const { data, error: dlError } = await supabase.storage
        .from(bucket)
        .download(path);

      if (dlError || !data) {
        console.error('Error downloading document:', dlError);
        setError(true);
        return;
      }

      setBlobUrl(URL.createObjectURL(data));
      if (isPdfFile(url)) {
        const buffer = await data.arrayBuffer();
        setPdfData(buffer);
      }
    } catch (err) {
      console.error('Error loading document:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [bucket]);

  useEffect(() => {
    if (open && documentUrl) {
      loadDocument(documentUrl);
    }
    if (!open) {
      cleanup();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, documentUrl]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [blobUrl]);

  const handleDownload = async () => {
    if (!documentUrl) return;
    const path = extractPath(documentUrl, bucket);
    const result = await downloadAsBlob(bucket, path);
    if (result) {
      const link = document.createElement('a');
      link.href = result.blobUrl;
      link.download = path.split('/').pop() || 'document';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => result.revoke(), 60000);
    }
  };

  const formatDateStr = (dateStr: string | null | undefined) => {
    if (!dateStr) return null;
    try {
      return format(new Date(dateStr), 'dd MMMM yyyy');
    } catch {
      return dateStr;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Optional metadata header */}
          {metadata?.personnelName && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/30 border border-border/50">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                {metadata.personnelName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">Certificate Holder</span>
                </div>
                <p className="font-semibold text-foreground">{metadata.personnelName}</p>
              </div>
            </div>
          )}

          {/* Document Preview */}
          {documentUrl ? (
            <div className="border rounded-lg overflow-hidden bg-muted/20">
              <div className="p-3 border-b bg-muted/30 flex items-center justify-between">
                <span className="text-sm font-medium">Document Preview</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                  disabled={!blobUrl || loading}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Download
                </Button>
              </div>
              <div className="p-4 flex justify-center">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : error ? (
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
                    <Button variant="outline" onClick={() => loadDocument(documentUrl)}>
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Retry
                    </Button>
                  </div>
                ) : blobUrl && isImageFile(documentUrl) ? (
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
                          src={blobUrl}
                          alt={title}
                          className="object-contain rounded transition-transform"
                          style={{
                            transform: `rotate(${imgRotation}deg) scale(${imgZoom})`,
                            maxHeight: imgRotation % 180 !== 0 ? '600px' : '400px',
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ) : pdfData && isPdfFile(documentUrl) ? (
                  <div className="w-full">
                    <PdfViewer pdfData={pdfData} />
                  </div>
                ) : blobUrl ? (
                  <iframe
                    src={blobUrl}
                    className="w-full h-[70vh] rounded"
                    title={title}
                  />
                ) : (
                  <div className="flex flex-col items-center gap-4 py-8">
                    <File className="h-16 w-16 text-muted-foreground" />
                    <p className="text-muted-foreground">Document available</p>
                    <Button variant="outline" onClick={handleDownload} disabled={!blobUrl}>
                      <Download className="h-4 w-4 mr-2" />
                      Download Document
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mb-2 opacity-40" />
              <p>No document available</p>
            </div>
          )}

          {/* Metadata details grid */}
          {metadata && (metadata.dateOfIssue || metadata.expiryDate || metadata.placeOfIssue || metadata.issuingAuthority || metadata.category) && (
            <div className="grid grid-cols-2 gap-4">
              {metadata.dateOfIssue && (
                <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/30">
                  <Calendar className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">Date of Issue</div>
                    <div className="font-medium">{formatDateStr(metadata.dateOfIssue)}</div>
                  </div>
                </div>
              )}
              {metadata.expiryDate && (
                <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/30">
                  <Calendar className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">Expiry Date</div>
                    <div className="font-medium">{formatDateStr(metadata.expiryDate)}</div>
                  </div>
                </div>
              )}
              {metadata.placeOfIssue && (
                <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/30">
                  <MapPin className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">Place of Issue</div>
                    <div className="font-medium">{metadata.placeOfIssue}</div>
                  </div>
                </div>
              )}
              {metadata.issuingAuthority && (
                <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/30">
                  <Building2 className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">Issuing Authority</div>
                    <div className="font-medium">{metadata.issuingAuthority}</div>
                  </div>
                </div>
              )}
              {metadata.category && (
                <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/30">
                  <Tag className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">Category</div>
                    <div className="font-medium">{metadata.category}</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
