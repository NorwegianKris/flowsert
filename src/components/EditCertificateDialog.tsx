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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Award, Upload, X, FileText, Loader2, Sparkles, CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react';
import { Certificate } from '@/types';
import { fileToBase64Image } from '@/lib/pdfUtils';
import { ExtractionResult, isOcrSupported, getFileTypeStatus } from '@/types/certificateExtraction';
import { cn } from '@/lib/utils';
import { CertificateTypeSelector } from '@/components/CertificateTypeSelector';
import { useLookupAlias, useCreateAlias } from '@/hooks/useCertificateAliases';
import { normalizeCertificateTitle, isAmbiguousTitle } from '@/lib/certificateNormalization';
import { AmbiguityWarningDialog } from '@/components/AmbiguityWarningDialog';
import { useBusinessInfo } from '@/hooks/useBusinessInfo';

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
  const { isAdmin, role } = useAuth();
  const { business: businessInfo } = useBusinessInfo();
  const isAdminOrManager = isAdmin || role === 'manager';
  const useCanonicalCertificates = businessInfo?.use_canonical_certificates ?? false;

  // Form fields
  const [name, setName] = useState('');
  const [dateOfIssue, setDateOfIssue] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [placeOfIssue, setPlaceOfIssue] = useState('');
  const [issuingAuthority, setIssuingAuthority] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [existingDocumentUrl, setExistingDocumentUrl] = useState<string | null>(null);

  // Type selector state
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [originalTypeId, setOriginalTypeId] = useState<string | null>(null);
  const [titleChanged, setTitleChanged] = useState(false);
  const [rememberName, setRememberName] = useState(false);

  // Ambiguity warning
  const [ambiguityDialogOpen, setAmbiguityDialogOpen] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState(false);

  // UI states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [extractionResult, setExtractionResult] = useState<ExtractionResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Debounced name for alias lookup
  const [debouncedName, setDebouncedName] = useState('');

  // Debounce name changes for alias lookup
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedName(name);
    }, 400);
    return () => clearTimeout(timer);
  }, [name]);

  // Alias lookup - only run if title changed OR no original type
  const shouldLookupAlias = useCanonicalCertificates && debouncedName && (titleChanged || !originalTypeId);
  const { data: aliasMatch, isLoading: aliasLoading } = useLookupAlias(
    shouldLookupAlias ? debouncedName : null
  );

  // For info display - always lookup to show alias existence
  const { data: aliasInfo } = useLookupAlias(
    useCanonicalCertificates && debouncedName ? debouncedName : null
  );

  const createAliasMutation = useCreateAlias();

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
      setTitleChanged(false);
      setRememberName(false);

      // Set type from certificate - this is the source of truth
      const certTypeId = (certificate as any).certificate_type_id || null;
      setOriginalTypeId(certTypeId);
      setSelectedTypeId(certTypeId);
    }
  }, [certificate]);

  // Auto-select from alias match only if:
  // 1. No original type was set
  // 2. Title has changed OR we're still on initial load with no type
  useEffect(() => {
    if (!useCanonicalCertificates) return;
    
    if (aliasMatch && !originalTypeId && !selectedTypeId) {
      // Pre-select from alias match (suggestion for unmapped certificates)
      setSelectedTypeId(aliasMatch.certificate_type_id);
    }
  }, [aliasMatch, originalTypeId, selectedTypeId, useCanonicalCertificates]);

  const handleNameChange = (newName: string) => {
    setName(newName);
    if (newName !== certificate?.name) {
      setTitleChanged(true);
    }
  };

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
          handleNameChange(extractedData.certificateName);
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

  const doSubmit = async () => {
    if (!certificate) return;

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

      // Prepare update data
      const titleRaw = name;
      const titleNormalized = normalizeCertificateTitle(name);

      // Determine needs_review based on role and alias match
      let needsReview = (certificate as any).needs_review ?? false;
      if (useCanonicalCertificates) {
        if (isAdminOrManager && selectedTypeId) {
          // Admin selected a type - no review needed
          needsReview = false;
        } else if (!isAdminOrManager && selectedTypeId) {
          // Worker selected a type - still needs review unless alias matched
          needsReview = !aliasMatch || aliasMatch.certificate_type_id !== selectedTypeId;
        }
      }

      // Update the certificate
      const updateData: any = {
        name,
        date_of_issue: dateOfIssue,
        expiry_date: expiryDate || null,
        place_of_issue: placeOfIssue,
        issuing_authority: issuingAuthority,
        document_url: documentUrl,
      };

      // Add canonical certificate fields if feature is enabled
      if (useCanonicalCertificates) {
        updateData.title_raw = titleRaw;
        updateData.title_normalized = titleNormalized;
        updateData.certificate_type_id = selectedTypeId;
        updateData.needs_review = needsReview;
      }

      const { error: updateError } = await supabase
        .from('certificates')
        .update(updateData)
        .eq('id', certificate.id);

      if (updateError) throw updateError;

      // Create alias if admin checked "Remember this name"
      if (useCanonicalCertificates && isAdminOrManager && rememberName && selectedTypeId && titleNormalized) {
        try {
          await createAliasMutation.mutateAsync({
            aliasRaw: name,
            certificateTypeId: selectedTypeId,
          });
          toast.success('Alias created for future auto-matching');
        } catch (aliasError: any) {
          if (aliasError.code !== '23505') {
            console.error('Error creating alias:', aliasError);
          }
        }
      }

      toast.success('Certificate updated successfully');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating certificate:', error);
      toast.error('Failed to update certificate');
    } finally {
      setIsSubmitting(false);
      setPendingSubmit(false);
    }
  };

  const handleSubmit = async () => {
    if (!certificate) return;

    if (!dateOfIssue || !placeOfIssue || !issuingAuthority) {
      toast.error('Please fill in all required fields (Date of Issue, Place of Issue, Issuing Authority)');
      return;
    }

    // Check for ambiguity warning if admin wants to remember this name
    if (useCanonicalCertificates && isAdminOrManager && rememberName && selectedTypeId) {
      const normalized = normalizeCertificateTitle(name);
      if (isAmbiguousTitle(normalized)) {
        setPendingSubmit(true);
        setAmbiguityDialogOpen(true);
        return;
      }
    }

    await doSubmit();
  };

  const handleAmbiguityConfirm = async () => {
    setAmbiguityDialogOpen(false);
    await doSubmit();
  };

  const getStatusIcon = (status: 'green' | 'amber' | 'red') => {
    switch (status) {
      case 'green':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'amber':
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      case 'red':
        return <XCircle className="h-4 w-4 text-destructive" />;
    }
  };

  const getStatusBgClass = (status: 'green' | 'amber' | 'red') => {
    switch (status) {
      case 'green':
        return 'bg-green-500/10 border-green-500/30';
      case 'amber':
        return 'bg-warning/10 border-warning/30';
      case 'red':
        return 'bg-destructive/10 border-destructive/30';
    }
  };

  // Determine if we should show auto-matched badge
  const showAutoMatched = aliasMatch && selectedTypeId === aliasMatch.certificate_type_id && !originalTypeId;

  return (
    <>
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
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Certificate name"
              />
            </div>

            {/* Certificate Type Selector - only show if canonical certificates enabled */}
            {useCanonicalCertificates && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>Certificate Type {isAdminOrManager && '*'}</Label>
                  {/* Subtle alias indicator */}
                  {debouncedName && !aliasLoading && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className={cn(
                            "h-4 w-4 cursor-help",
                            aliasInfo ? "text-green-500" : "text-muted-foreground"
                          )} />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">
                            {aliasInfo
                              ? `Alias exists → ${aliasInfo.certificate_type_name}`
                              : "No alias exists for this name"}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  {aliasLoading && (
                    <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                  )}
                </div>
                <CertificateTypeSelector
                  value={selectedTypeId}
                  onChange={(typeId) => setSelectedTypeId(typeId)}
                  required={isAdminOrManager}
                  autoMatched={showAutoMatched}
                  placeholder={isAdminOrManager ? "Select certificate type..." : "Select type (optional)..."}
                />

                {/* Remember this name checkbox - admin only */}
                {isAdminOrManager && selectedTypeId && (
                  <div className="flex items-center space-x-2 pt-1">
                    <Checkbox
                      id="remember-name"
                      checked={rememberName}
                      onCheckedChange={(checked) => setRememberName(checked === true)}
                    />
                    <Label htmlFor="remember-name" className="text-sm text-muted-foreground cursor-pointer">
                      Remember this name for future auto-matching
                    </Label>
                  </div>
                )}
              </div>
            )}

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

      {/* Ambiguity Warning Dialog */}
      <AmbiguityWarningDialog
        open={ambiguityDialogOpen}
        onOpenChange={(open) => {
          setAmbiguityDialogOpen(open);
          if (!open) setPendingSubmit(false);
        }}
        normalizedTitle={normalizeCertificateTitle(name)}
        onConfirm={handleAmbiguityConfirm}
        onCancel={() => {
          setAmbiguityDialogOpen(false);
          setPendingSubmit(false);
        }}
      />
    </>
  );
}
