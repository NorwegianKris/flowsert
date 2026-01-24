import { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Award, Upload, X, FileText, Loader2, Sparkles, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { Certificate } from '@/types';
import { fileToBase64Image } from '@/lib/pdfUtils';
import { ExtractionResult, isOcrSupported, getFileTypeStatus } from '@/types/certificateExtraction';
import { cn } from '@/lib/utils';

interface EditCertificateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  certificate: Certificate | null;
  onSuccess: () => void;
}

export function EditCertificateDialog({
  open,
  onOpenChange,
  certificate,
  onSuccess,
}: EditCertificateDialogProps) {
  const [name, setName] = useState('');
  const [dateOfIssue, setDateOfIssue] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [placeOfIssue, setPlaceOfIssue] = useState('');
  const [issuingAuthority, setIssuingAuthority] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [existingDocumentUrl, setExistingDocumentUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [extractionResult, setExtractionResult] = useState<ExtractionResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const scanInputRef = useRef<HTMLInputElement | null>(null);

  // Populate form when certificate changes
  useEffect(() => {
    if (certificate) {
      setName(certificate.name || '');
      setDateOfIssue(certificate.dateOfIssue || '');
      setExpiryDate(certificate.expiryDate || '');
      setPlaceOfIssue(certificate.placeOfIssue || '');
      setIssuingAuthority(certificate.issuingAuthority || '');
      setExistingDocumentUrl(certificate.documentUrl || null);
      setFile(null);
      setExtractionResult(null);
    }
  }, [certificate]);

  const handleRemoveFile = () => {
    setFile(null);
    setExtractionResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveExistingDocument = () => {
    setExistingDocumentUrl(null);
  };

  // Handle smart scan of uploaded file
  const handleSmartScan = async (fileToScan: File) => {
    const fileTypeStatus = getFileTypeStatus(fileToScan.type);

    if (fileTypeStatus === 'unsupported') {
      setExtractionResult({
        status: 'red',
        confidence: 0,
        extractedData: {
          certificateName: null,
          dateOfIssue: null,
          expiryDate: null,
          placeOfIssue: null,
          issuingAuthority: null,
          matchedCategory: null,
          matchedCategoryId: null,
        },
        fieldsExtracted: 0,
        issues: [`File type "${fileToScan.type || 'unknown'}" cannot be scanned.`],
      });
      return;
    }

    setIsScanning(true);
    setExtractionResult(null);

    try {
      const { base64, mimeType } = await fileToBase64Image(fileToScan);

      const { data, error } = await supabase.functions.invoke('extract-certificate-data', {
        body: {
          imageBase64: base64,
          mimeType,
          existingCategories: [],
        },
      });

      if (error) throw error;

      const result: ExtractionResult = data;
      setExtractionResult(result);

      // Auto-fill fields based on extraction
      if (result.status !== 'red') {
        const { extractedData } = result;
        if (extractedData.certificateName && !name) {
          setName(extractedData.certificateName);
        }
        if (extractedData.dateOfIssue) {
          setDateOfIssue(extractedData.dateOfIssue);
        }
        if (extractedData.expiryDate) {
          setExpiryDate(extractedData.expiryDate);
        }
        if (extractedData.placeOfIssue) {
          setPlaceOfIssue(extractedData.placeOfIssue);
        }
        if (extractedData.issuingAuthority) {
          setIssuingAuthority(extractedData.issuingAuthority);
        }

        if (result.status === 'green') {
          toast.success('Certificate details extracted successfully!');
        } else {
          toast.warning('Partial extraction - please verify the details');
        }
      } else {
        toast.error('Could not extract details from this document');
      }
    } catch (error) {
      console.error('Scan error:', error);
      toast.error('Failed to scan document');
      setExtractionResult({
        status: 'red',
        confidence: 0,
        extractedData: {
          certificateName: null,
          dateOfIssue: null,
          expiryDate: null,
          placeOfIssue: null,
          issuingAuthority: null,
          matchedCategory: null,
          matchedCategoryId: null,
        },
        fieldsExtracted: 0,
        issues: ['Failed to analyze document'],
      });
    } finally {
      setIsScanning(false);
    }
  };

  const handleFileSelected = async (selectedFile: File) => {
    setFile(selectedFile);
    setExistingDocumentUrl(null);
    // Automatically scan the new file
    await handleSmartScan(selectedFile);
  };

  const handleSubmit = async () => {
    if (!certificate) return;

    if (!dateOfIssue || !placeOfIssue || !issuingAuthority) {
      toast.error('Please fill in all required fields (Date of Issue, Place of Issue, Issuing Authority)');
      return;
    }

    setIsSubmitting(true);

    try {
      let documentUrl = existingDocumentUrl;

      // If there's a new file, upload it
      if (file) {
        const fileExt = file.name.split('.').pop();
        const filePath = `${certificate.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('certificate-documents')
          .upload(filePath, file);

        if (uploadError) {
          console.error('Error uploading file:', uploadError);
          toast.error('Failed to upload document');
          setIsSubmitting(false);
          return;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('certificate-documents')
          .getPublicUrl(filePath);

        documentUrl = urlData.publicUrl;
      }

      // Update the certificate
      const { error: updateError } = await supabase
        .from('certificates')
        .update({
          name,
          date_of_issue: dateOfIssue,
          expiry_date: expiryDate || null,
          place_of_issue: placeOfIssue,
          issuing_authority: issuingAuthority,
          document_url: documentUrl,
        })
        .eq('id', certificate.id);

      if (updateError) throw updateError;

      toast.success('Certificate updated successfully');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating certificate:', error);
      toast.error('Failed to update certificate');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusIcon = (status: 'green' | 'amber' | 'red') => {
    switch (status) {
      case 'green':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'amber':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'red':
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusBgClass = (status: 'green' | 'amber' | 'red') => {
    switch (status) {
      case 'green':
        return 'bg-green-500/10 border-green-500/30';
      case 'amber':
        return 'bg-amber-500/10 border-amber-500/30';
      case 'red':
        return 'bg-red-500/10 border-red-500/30';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            Edit Certificate
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cert-name">Certificate Name *</Label>
            <Input
              id="cert-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Certificate name"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date-of-issue">Date of Issue *</Label>
              <Input
                id="date-of-issue"
                type="date"
                value={dateOfIssue}
                onChange={(e) => setDateOfIssue(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiry-date">Expiry Date</Label>
              <Input
                id="expiry-date"
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="place-of-issue">Place of Issue *</Label>
              <Input
                id="place-of-issue"
                value={placeOfIssue}
                onChange={(e) => setPlaceOfIssue(e.target.value)}
                placeholder="e.g., Norway"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="issuing-authority">Issuing Authority *</Label>
              <Input
                id="issuing-authority"
                value={issuingAuthority}
                onChange={(e) => setIssuingAuthority(e.target.value)}
                placeholder="e.g., DNV"
              />
            </div>
          </div>

          {/* Document section with Smart Scan */}
          <div className="space-y-2">
            <Label>Document (PDF or Image)</Label>
            
            {/* Scanning indicator */}
            {isScanning && (
              <div className="p-3 rounded-md bg-muted/50 border border-border">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-sm">Analyzing document...</span>
                </div>
              </div>
            )}

            {/* Extraction result indicator */}
            {extractionResult && !isScanning && (
              <div className={cn(
                "p-2 rounded-md border text-sm",
                getStatusBgClass(extractionResult.status)
              )}>
                <div className="flex items-center gap-2">
                  {getStatusIcon(extractionResult.status)}
                  <span>
                    {extractionResult.status === 'green' && 'Details extracted successfully'}
                    {extractionResult.status === 'amber' && 'Partial extraction - please verify'}
                    {extractionResult.status === 'red' && 'Could not extract details'}
                  </span>
                </div>
              </div>
            )}

            {existingDocumentUrl && !file ? (
              <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50 border border-border">
                <FileText className="h-4 w-4 text-primary" />
                <span className="text-sm flex-1 truncate">Existing document</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(existingDocumentUrl, '_blank')}
                >
                  View
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={handleRemoveExistingDocument}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : file ? (
              <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50 border border-border">
                <FileText className="h-4 w-4 text-primary" />
                <span className="text-sm flex-1 truncate">{file.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={handleRemoveFile}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={(e) => {
                    const selectedFile = e.target.files?.[0] || null;
                    if (selectedFile) {
                      handleFileSelected(selectedFile);
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isScanning}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Upload & Auto-Fill
                </Button>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || isScanning}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
