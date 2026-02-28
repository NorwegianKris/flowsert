import { useState, useRef, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GeoLocationInput } from '@/components/ui/geo-location-input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Award, Upload, X, FileText, Loader2, CheckCircle2, AlertTriangle, Trash2, PenLine, ChevronDown, ChevronRight, Info } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { SmartCertificateUpload } from './SmartCertificateUpload';
import { ExtractionResult } from '@/types/certificateExtraction';
import { cn } from '@/lib/utils';
import { CertificateTypeSelector } from './CertificateTypeSelector';
import { IssuerTypeSelector } from './IssuerTypeSelector';
import { AmbiguityWarningDialog } from './AmbiguityWarningDialog';
import { useLookupAlias, useCreateAlias, useUpdateAliasLastSeen } from '@/hooks/useCertificateAliases';
import { useLookupIssuerAlias, useCreateIssuerAlias } from '@/hooks/useIssuerAliases';
import { useIssuerTypes } from '@/hooks/useIssuerTypes';
import { normalizeCertificateTitle, isAmbiguousTitle } from '@/lib/certificateNormalization';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AddCertificateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  personnelId: string;
  personnelName: string;
  onSuccess: () => void;
}

interface CertificateEntry {
  id: string;
  name: string;
  dateOfIssue: string;
  expiryDate: string;
  placeOfIssue: string;
  issuingAuthority: string;
  file: File | null;
  categoryId: string | null;
  // OCR tracking
  wasAutoFilled?: boolean;
  extractionStatus?: 'green' | 'amber' | 'red';
  fieldConfidence?: {
    dateOfIssue?: 'high' | 'medium' | 'low';
    expiryDate?: 'high' | 'medium' | 'low';
    placeOfIssue?: 'high' | 'medium' | 'low';
    issuingAuthority?: 'high' | 'medium' | 'low';
  };
  // Canonical mapping fields
  certificateTypeId?: string | null;
  certificateTypeName?: string;
  certificateTypeFreeText?: string;
  titleRaw?: string;
  rememberAlias?: boolean;
  aliasAutoMatched?: boolean;
  // Issuer canonical mapping fields
  issuerTypeId?: string | null;
  issuerTypeName?: string;
  issuerTypeFreeText?: string;
  rememberIssuerAlias?: boolean;
  issuerAliasAutoMatched?: boolean;
  // Manual upload flag
  isManualEntry?: boolean;
  // OCR extraction data for type selector
  ocrExtractedName?: string;
  ocrConfidence?: number;
}

interface CertificateCategory {
  id: string;
  name: string;
}

export function AddCertificateDialog({
  open,
  onOpenChange,
  personnelId,
  personnelName,
  onSuccess,
}: AddCertificateDialogProps) {
  const { businessId, isAdmin, role } = useAuth();
  const isAdminOrManager = isAdmin || role === 'manager';
  
  const [categories, setCategories] = useState<CertificateCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [certificates, setCertificates] = useState<CertificateEntry[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedCertId, setExpandedCertId] = useState<string | null>(null);
  const manualFileInputRef = useRef<HTMLInputElement | null>(null);
  
  // Ambiguity warning dialog state
  const [ambiguityWarningOpen, setAmbiguityWarningOpen] = useState(false);
  const [pendingAmbiguousAlias, setPendingAmbiguousAlias] = useState<{
    certId: string;
    normalizedTitle: string;
    typeId: string;
    rawTitle: string;
  } | null>(null);
  
  // Alias mutation hooks
  const createAlias = useCreateAlias();
  const createIssuerAlias = useCreateIssuerAlias();
  
  // Fetch issuer types for auto-matching
  const { data: issuerTypes } = useIssuerTypes();
  
  // Compute normalized free text for the currently expanded certificate
  const freeTextNormalized = useMemo(() => {
    const currentCert = certificates.find(c => c.id === expandedCertId);
    return currentCert?.certificateTypeFreeText?.trim()
      ? normalizeCertificateTitle(currentCert.certificateTypeFreeText)
      : null;
  }, [certificates, expandedCertId]);
  
  // Look up alias for the free text input
  const { data: aliasMatch, isLoading: isLoadingAlias } = useLookupAlias(freeTextNormalized);
  
  // Compute normalized issuer free text for the currently expanded certificate
  const issuerFreeTextNormalized = useMemo(() => {
    const currentCert = certificates.find(c => c.id === expandedCertId);
    return currentCert?.issuerTypeFreeText?.trim()
      ? normalizeCertificateTitle(currentCert.issuerTypeFreeText)
      : null;
  }, [certificates, expandedCertId]);
  
  // Look up issuer alias for the free text input
  const { data: issuerAliasMatch } = useLookupIssuerAlias(issuerFreeTextNormalized);

  // Fetch certificate categories from database
  useEffect(() => {
    const fetchCategories = async () => {
      if (!businessId) {
        setLoadingCategories(false);
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from('certificate_categories')
          .select('id, name')
          .eq('business_id', businessId)
          .order('name');

        if (error) throw error;
        setCategories(data || []);
      } catch (error) {
        console.error('Error fetching certificate categories:', error);
        toast.error('Failed to load certificate categories');
      } finally {
        setLoadingCategories(false);
      }
    };

    if (open) {
      fetchCategories();
      setCertificates([]);
      setExpandedCertId(null);
    }
  }, [businessId, open]);

  // Handle OCR extraction result - creates a new certificate entry
  const handleExtractionComplete = (result: ExtractionResult, file: File) => {
    const { extractedData } = result;

    console.log('FRONTEND_OCR:', JSON.stringify({
      certificateName: extractedData?.certificateName,
      suggestedTypeName: extractedData?.suggestedTypeName,
      classificationConfidence: extractedData?.classificationConfidence,
      ocrHintPassed: extractedData?.suggestedTypeName ? {
        extractedName: extractedData.suggestedTypeName,
        confidence: extractedData.classificationConfidence
      } : null
    }));

    const getConfidence = (status: string): 'high' | 'medium' | 'low' => {
      if (result.status === 'green') return 'high';
      if (result.status === 'amber') return 'medium';
      return 'low';
    };

    // Use filename as certificate name (remove extension)
    const fileName = file.name.replace(/\.[^/.]+$/, '');

    const newCert: CertificateEntry = {
      id: `cert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: fileName, // Always use filename
      dateOfIssue: extractedData.dateOfIssue || '',
      expiryDate: extractedData.expiryDate || '',
      placeOfIssue: extractedData.placeOfIssue || '',
      issuingAuthority: extractedData.issuingAuthority || '',
      file,
      categoryId: null, // Personnel choose themselves
      wasAutoFilled: result.status !== 'red',
      extractionStatus: result.status,
      fieldConfidence: result.status !== 'red' ? {
        dateOfIssue: extractedData.dateOfIssue ? getConfidence(result.status) : undefined,
        expiryDate: extractedData.expiryDate ? getConfidence(result.status) : undefined,
        placeOfIssue: extractedData.placeOfIssue ? getConfidence(result.status) : undefined,
        issuingAuthority: extractedData.issuingAuthority ? getConfidence(result.status) : undefined,
      } : undefined,
      certificateTypeFreeText: '', // For free text certificate type
      titleRaw: extractedData.certificateName || fileName,
      ocrExtractedName: extractedData.suggestedTypeName || extractedData.certificateName || '',
      ocrConfidence: extractedData.classificationConfidence || result.confidence,
    };

    // Auto-set issuer if matched
    if (extractedData.matchedIssuerId && extractedData.matchedIssuer) {
      newCert.issuerTypeId = extractedData.matchedIssuerId;
      newCert.issuerTypeName = extractedData.matchedIssuer;
      newCert.issuingAuthority = extractedData.matchedIssuer;
      newCert.issuerAliasAutoMatched = true;
    }

    // Fire-and-forget geocoding for plain text place of issue
    if (extractedData.placeOfIssue) {
      const certId = newCert.id;
      fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(extractedData.placeOfIssue)}&format=json&addressdetails=1&featuretype=city&limit=3`, {
        headers: { 'User-Agent': 'FlowSert/1.0' }
      })
        .then(r => r.json())
        .then(results => {
          if (results?.length > 0) {
            // Find best city-level match
            const cityResult = results.find((r: any) => r.address?.city || r.address?.town) || results[0];
            const addr = cityResult.address || {};
            const cityName = addr.city || addr.town || addr.village || addr.state;
            const country = addr.country;
            
            if (cityName && country) {
              setCertificates(prev => prev.map(c =>
                c.id === certId
                  ? { ...c, placeOfIssue: `${cityName}, ${country}` }
                  : c
              ));
            }
            // If no city/country extracted, keep the original plain text
          }
        })
        .catch(() => { /* keep plain text fallback */ });
    }

    setCertificates(prev => [...prev, newCert]);
    
    // Auto-expand the first certificate if none expanded
    if (certificates.length === 0) {
      setExpandedCertId(newCert.id);
    }
  };

  // Handle manual upload - creates empty certificate entry with file
  const handleManualUpload = (file: File) => {
    const fileName = file.name.replace(/\.[^/.]+$/, '');

    const newCert: CertificateEntry = {
      id: `cert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: fileName,
      dateOfIssue: '',
      expiryDate: '',
      placeOfIssue: '',
      issuingAuthority: '',
      file,
      categoryId: null,
      isManualEntry: true,
      certificateTypeFreeText: '',
    };

    setCertificates(prev => [...prev, newCert]);
    setExpandedCertId(newCert.id);
  };

  const handleRemoveCertificate = (id: string) => {
    setCertificates(prev => prev.filter(c => c.id !== id));
    if (expandedCertId === id) {
      setExpandedCertId(null);
    }
  };

  const handleFieldChange = (
    id: string,
    field: keyof CertificateEntry,
    value: string | null
  ) => {
    setCertificates(prev =>
      prev.map(c => c.id === id ? { ...c, [field]: value } : c)
    );
  };

  const handleSubmit = async () => {
    // Validate certificates - only require name and date of issue
    const validCerts = certificates.filter(c => {
      const hasType = c.certificateTypeId || c.certificateTypeFreeText?.trim();
      const hasDateOfIssue = c.dateOfIssue?.trim();
      
      if (!hasType || !hasDateOfIssue) return false;
      
      return true;
    });

    if (validCerts.length === 0) {
      toast.error('Please select or enter a certificate type and date of issue for each certificate');
      return;
    }

    if (validCerts.length < certificates.length) {
      toast.warning(`${certificates.length - validCerts.length} certificate(s) are missing required fields and will be skipped`);
    }

    if (validCerts.length < certificates.length) {
      toast.warning(`${certificates.length - validCerts.length} certificate(s) are missing required fields and will be skipped`);
    }

    setIsSubmitting(true);

    try {
      for (const cert of validCerts) {
        // Determine title_raw based on how type was specified
        // This ensures title_raw stores the CERTIFICATE TYPE, not the filename
        let titleRaw: string | null = cert.titleRaw || null;
        if (cert.certificateTypeFreeText?.trim()) {
          // User typed free text - store exactly what they typed
          titleRaw = cert.certificateTypeFreeText.trim();
        } else if (cert.certificateTypeId && cert.certificateTypeName) {
          // User selected from dropdown - store the type name
          titleRaw = cert.certificateTypeName;
        }
        // If neither, title_raw falls back to OCR extraction or null
        
        const titleNormalized = titleRaw ? normalizeCertificateTitle(titleRaw) : null;
        
        let needsReview = false;
        if (!isAdminOrManager) {
          needsReview = !cert.aliasAutoMatched;
        }
        
        const { data: insertedCert, error: insertError } = await supabase
          .from('certificates')
          .insert({
            personnel_id: personnelId,
            name: cert.certificateTypeName || cert.certificateTypeFreeText || cert.name,
            date_of_issue: cert.dateOfIssue,
            expiry_date: cert.expiryDate || null,
            place_of_issue: cert.placeOfIssue || '',
            issuing_authority: cert.issuingAuthority || '',
            category_id: cert.categoryId,
            title_raw: titleRaw,
            title_normalized: titleNormalized,
            certificate_type_id: cert.certificateTypeId || null,
            issuer_type_id: cert.issuerTypeId || null,
            needs_review: needsReview,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        // Upload file if exists
        if (cert.file && insertedCert) {
          const fileExt = cert.file.name.split('.').pop();
          const filePath = `${insertedCert.id}/${Date.now()}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from('certificate-documents')
            .upload(filePath, cert.file);

          if (uploadError) {
            console.error('Error uploading file:', uploadError);
            toast.error(`Failed to upload document for ${cert.name}`);
            continue;
          }

          const { data: urlData } = supabase.storage
            .from('certificate-documents')
            .getPublicUrl(filePath);

          await supabase
            .from('certificates')
            .update({ document_url: urlData.publicUrl })
            .eq('id', insertedCert.id);
        }
        
        // Create alias if admin checked "Remember this name" 
        if (isAdminOrManager && cert.rememberAlias && cert.certificateTypeId && titleRaw) {
          try {
            await createAlias.mutateAsync({
              aliasRaw: titleRaw,
              certificateTypeId: cert.certificateTypeId,
            });
          } catch (aliasError) {
            console.error('Error creating alias:', aliasError);
          }
        }
        
        // Create issuer alias if admin checked "Remember this issuer"
        if (isAdminOrManager && cert.rememberIssuerAlias && cert.issuerTypeId && cert.issuingAuthority) {
          try {
            await createIssuerAlias.mutateAsync({
              aliasRaw: cert.issuingAuthority,
              issuerTypeId: cert.issuerTypeId,
            });
          } catch (aliasError) {
            console.error('Error creating issuer alias:', aliasError);
          }
        }
      }

      toast.success(`${validCerts.length} certificate(s) added successfully`);
      onSuccess();
      onOpenChange(false);
      setCertificates([]);
    } catch (error) {
      console.error('Error adding certificates:', error);
      toast.error('Failed to add certificates');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderFieldIndicator = (confidence?: 'high' | 'medium' | 'low') => {
    if (!confidence) return null;
    if (confidence === 'high') {
      return <CheckCircle2 className="h-3.5 w-3.5 text-primary" />;
    }
    if (confidence === 'medium') {
      return <AlertTriangle className="h-3.5 w-3.5 text-warning" />;
    }
    return null;
  };

  const getStatusColor = (status?: 'green' | 'amber' | 'red') => {
    switch (status) {
      case 'green': return 'border-primary/50 bg-primary/5';
      case 'amber': return 'border-warning/50 bg-warning/5';
      case 'red': return 'border-destructive/50 bg-destructive/5';
      default: return 'border-border';
    }
  };

  const getStatusIcon = (status?: 'green' | 'amber' | 'red') => {
    switch (status) {
      case 'green': return <CheckCircle2 className="h-4 w-4 text-primary" />;
      case 'amber': return <AlertTriangle className="h-4 w-4 text-warning" />;
      case 'red': return <AlertTriangle className="h-4 w-4 text-destructive" />;
      default: return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };
  
  const handleAmbiguityConfirm = () => {
    if (pendingAmbiguousAlias) {
      setCertificates(prev =>
        prev.map(c =>
          c.id === pendingAmbiguousAlias.certId
            ? { ...c, rememberAlias: true }
            : c
        )
      );
    }
    setAmbiguityWarningOpen(false);
    setPendingAmbiguousAlias(null);
  };
  
  const handleAmbiguityCancel = () => {
    setAmbiguityWarningOpen(false);
    setPendingAmbiguousAlias(null);
  };

  const processedCount = certificates.length;
  const readyCount = certificates.filter(c => (c.certificateTypeId || c.certificateTypeFreeText?.trim()) && c.dateOfIssue).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            Add Certificates for {personnelName}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Smart Upload Section */}
            <div className="space-y-3">
              <SmartCertificateUpload
                existingCategories={categories}
                existingIssuers={issuerTypes?.map(t => ({ id: t.id, name: t.name })) || []}
                onExtractionComplete={handleExtractionComplete}
                disabled={loadingCategories}
              />
              
              {/* Manual Upload Option */}
              <div className="flex items-center gap-2 pt-2">
                <div className="flex-1 border-t border-border" />
                <span className="text-xs text-muted-foreground">or</span>
                <div className="flex-1 border-t border-border" />
              </div>
              
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                className="hidden"
                ref={manualFileInputRef}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleManualUpload(file);
                    e.target.value = '';
                  }
                }}
              />
              
              <Button
                variant="outline"
                className="w-full"
                onClick={() => manualFileInputRef.current?.click()}
                disabled={loadingCategories}
              >
                <PenLine className="h-4 w-4 mr-2" />
                Manual Upload (fill in details yourself)
              </Button>
            </div>

            {/* Processed Certificates Section */}
            {certificates.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">
                    Processed Certificates ({processedCount})
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    {readyCount} ready to save
                  </span>
                </div>

                {/* Verification note */}
                <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border border-border">
                  <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    Please review each certificate below and ensure all fields are correct before saving. Click on a certificate to expand and edit its details.
                  </p>
                </div>

                <div className="space-y-3">
                  {certificates.map((cert) => (
                    <div
                      key={cert.id}
                      className={cn(
                        "rounded-lg border transition-all",
                        getStatusColor(cert.extractionStatus)
                      )}
                    >
                      {/* Certificate Header - Always visible */}
                      <div
                        className="flex items-center gap-3 p-3 cursor-pointer"
                        onClick={() => setExpandedCertId(expandedCertId === cert.id ? null : cert.id)}
                      >
                        {cert.isManualEntry ? (
                          <PenLine className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          getStatusIcon(cert.extractionStatus)
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {cert.certificateTypeName || cert.certificateTypeFreeText || cert.name || 'Unnamed Certificate'}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {cert.isManualEntry ? (
                              <span className="italic">Manual entry</span>
                            ) : null}
                            {cert.file?.name && !cert.isManualEntry && cert.file.name}
                            {cert.isManualEntry && cert.file?.name && ` • ${cert.file.name}`}
                            {cert.categoryId && categories.find(c => c.id === cert.categoryId) && (
                              <span className="ml-2">
                                → {categories.find(c => c.id === cert.categoryId)?.name}
                              </span>
                            )}
                          </p>
                        </div>
                        {/* Expand/collapse indicator */}
                        <div className="flex-shrink-0 text-muted-foreground">
                          {expandedCertId === cert.id ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 flex-shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveCertificate(cert.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </div>

                      {/* Expanded Details */}
                      {expandedCertId === cert.id && (
                        <div className="px-3 pb-3 pt-0 space-y-3 border-t">
                          <div className="pt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {/* Certificate Name field removed — name is derived from type selection */}

                            {/* Category Selection */}
                            <div className="sm:col-span-2 space-y-1">
                              <Label className="text-xs text-muted-foreground">
                                Category
                              </Label>
                              <Select
                                value={cert.categoryId || 'none'}
                                onValueChange={(value) => handleFieldChange(cert.id, 'categoryId', value === 'none' ? null : value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a category..." />
                                </SelectTrigger>
                                <SelectContent className="z-[200]">
                                  <SelectItem value="none">No category</SelectItem>
                                  {categories.map((cat) => (
                                    <SelectItem key={cat.id} value={cat.id}>
                                      {cat.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Date of Issue */}
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                                Date of Issue *
                                {renderFieldIndicator(cert.fieldConfidence?.dateOfIssue)}
                              </Label>
                              <Input
                                type="date"
                                value={cert.dateOfIssue}
                                onChange={(e) => handleFieldChange(cert.id, 'dateOfIssue', e.target.value)}
                              />
                            </div>

                            {/* Expiry Date */}
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                                Expiry Date
                                {renderFieldIndicator(cert.fieldConfidence?.expiryDate)}
                              </Label>
                              <Input
                                type="date"
                                value={cert.expiryDate}
                                onChange={(e) => handleFieldChange(cert.id, 'expiryDate', e.target.value)}
                              />
                            </div>

                            {/* Place of Issue */}
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                                Place of Issue
                                {renderFieldIndicator(cert.fieldConfidence?.placeOfIssue)}
                              </Label>
                              <GeoLocationInput
                                placeholder="e.g., Norway"
                                value={cert.placeOfIssue}
                                onChange={(value) => handleFieldChange(cert.id, 'placeOfIssue', value)}
                              />
                            </div>

                            {/* Issuing Authority */}
                            <div className="sm:col-span-2 space-y-1">
                              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                                Issuing Authority
                                {renderFieldIndicator(cert.fieldConfidence?.issuingAuthority)}
                                {cert.issuerAliasAutoMatched && (
                                  <span className="text-xs text-primary ml-1">(Auto-matched)</span>
                                )}
                              </Label>
                              <IssuerTypeSelector
                                value={cert.issuerTypeId || null}
                                onChange={(typeId, typeName) => {
                                  handleFieldChange(cert.id, 'issuerTypeId', typeId);
                                  handleFieldChange(cert.id, 'issuerTypeName', typeName || null);
                                  if (typeId) {
                                    handleFieldChange(cert.id, 'issuerTypeFreeText', '');
                                    handleFieldChange(cert.id, 'issuingAuthority', typeName || '');
                                    handleFieldChange(cert.id, 'issuerAliasAutoMatched', '');
                                  }
                                }}
                                autoMatched={cert.issuerAliasAutoMatched}
                                placeholder="Select issuer..."
                                allowFreeText={true}
                                freeTextValue={cert.issuerTypeFreeText || ''}
                                onFreeTextChange={(text) => {
                                  handleFieldChange(cert.id, 'issuerTypeFreeText', text);
                                  handleFieldChange(cert.id, 'issuingAuthority', text);
                                  if (text) {
                                    handleFieldChange(cert.id, 'issuerTypeId', null);
                                    handleFieldChange(cert.id, 'issuerTypeName', null);
                                    handleFieldChange(cert.id, 'issuerAliasAutoMatched', '');
                                  }
                                }}
                              />
                              
                              {/* Issuer Alias Match Feedback */}
                              {expandedCertId === cert.id && 
                               cert.issuerTypeFreeText?.trim() && 
                               !cert.issuerTypeId && 
                               issuerAliasMatch && 
                               issuerAliasMatch.issuer_type_name && (
                                <div className="flex items-center gap-2 mt-1 p-2 rounded bg-primary/5 border border-primary/20">
                                  <span className="text-xs text-muted-foreground">
                                    Matched: <span className="font-medium text-foreground">{issuerAliasMatch.issuer_type_name}</span>
                                  </span>
                                  <Button
                                    type="button"
                                    variant="link"
                                    size="sm"
                                    className="h-auto p-0 text-xs text-primary"
                                    onClick={() => {
                                      handleFieldChange(cert.id, 'issuerTypeId', issuerAliasMatch.issuer_type_id);
                                      handleFieldChange(cert.id, 'issuerTypeName', issuerAliasMatch.issuer_type_name);
                                      handleFieldChange(cert.id, 'issuerTypeFreeText', '');
                                      handleFieldChange(cert.id, 'issuingAuthority', issuerAliasMatch.issuer_type_name || '');
                                      handleFieldChange(cert.id, 'issuerAliasAutoMatched', 'true');
                                    }}
                                  >
                                    Use this issuer
                                  </Button>
                                </div>
                              )}
                            </div>

                            {/* Certificate Type Selector */}
                            <div className="sm:col-span-2 space-y-1">
                              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                                Certificate Type {isAdminOrManager && '*'}
                                {cert.aliasAutoMatched && (
                                  <span className="text-xs text-primary ml-1">(Auto-matched)</span>
                                )}
                              </Label>
                              <CertificateTypeSelector
                                businessId={businessId || undefined}
                                value={cert.certificateTypeId || null}
                                onChange={(typeId, typeName) => {
                                  handleFieldChange(cert.id, 'certificateTypeId', typeId);
                                  handleFieldChange(cert.id, 'certificateTypeName', typeName || null);
                                  if (typeId) {
                                    handleFieldChange(cert.id, 'certificateTypeFreeText', '');
                                    handleFieldChange(cert.id, 'aliasAutoMatched', '');
                                  }
                                }}
                                required={isAdminOrManager}
                                autoMatched={cert.aliasAutoMatched}
                                placeholder={isAdminOrManager ? "Select certificate type..." : "Optional: Select type..."}
                                categoryFilter={cert.categoryId}
                                ocrHint={cert.ocrExtractedName ? { extractedName: cert.ocrExtractedName, confidence: cert.ocrConfidence || 0 } : null}
                                showFallbackInput={true}
                                freeTextValue={cert.certificateTypeFreeText || ''}
                                onFreeTextChange={(text) => {
                                  handleFieldChange(cert.id, 'certificateTypeFreeText', text);
                                  if (text) {
                                    handleFieldChange(cert.id, 'certificateTypeId', null);
                                    handleFieldChange(cert.id, 'certificateTypeName', null);
                                    handleFieldChange(cert.id, 'aliasAutoMatched', '');
                                  }
                                }}
                              />
                              
                              {/* Alias Match Feedback */}
                              {expandedCertId === cert.id && 
                               cert.certificateTypeFreeText?.trim() && 
                               !cert.certificateTypeId && 
                               aliasMatch && 
                               aliasMatch.certificate_type_name && (
                                <div className="flex items-center gap-2 mt-1 p-2 rounded bg-primary/5 border border-primary/20">
                                  <span className="text-xs text-muted-foreground">
                                    Matched: <span className="font-medium text-foreground">{aliasMatch.certificate_type_name}</span>
                                  </span>
                                  <Button
                                    type="button"
                                    variant="link"
                                    size="sm"
                                    className="h-auto p-0 text-xs text-primary"
                                    onClick={() => {
                                      handleFieldChange(cert.id, 'certificateTypeId', aliasMatch.certificate_type_id);
                                      handleFieldChange(cert.id, 'certificateTypeName', aliasMatch.certificate_type_name);
                                      handleFieldChange(cert.id, 'certificateTypeFreeText', '');
                                      handleFieldChange(cert.id, 'aliasAutoMatched', 'true');
                                    }}
                                  >
                                    Use this type
                                  </Button>
                                </div>
                              )}
                            </div>

                            {/* Remember Alias Checkbox */}
                            {isAdminOrManager && cert.certificateTypeId && !cert.aliasAutoMatched && (
                              <div className="sm:col-span-2 flex items-center space-x-2">
                                <Checkbox
                                  id={`remember-${cert.id}`}
                                  checked={cert.rememberAlias || false}
                                  onCheckedChange={(checked) => {
                                    // Use certificateTypeName or certificateTypeFreeText for normalized title
                                    const titleForNormalization = cert.certificateTypeName || cert.certificateTypeFreeText || '';
                                    const normalizedTitle = normalizeCertificateTitle(titleForNormalization);
                                    
                                    if (checked && isAmbiguousTitle(normalizedTitle)) {
                                      setPendingAmbiguousAlias({
                                        certId: cert.id,
                                        normalizedTitle,
                                        typeId: cert.certificateTypeId!,
                                        rawTitle: titleForNormalization,
                                      });
                                      setAmbiguityWarningOpen(true);
                                      return;
                                    }
                                    
                                    handleFieldChange(cert.id, 'rememberAlias', checked ? 'true' : '');
                                  }}
                                />
                                <Label
                                  htmlFor={`remember-${cert.id}`}
                                  className="text-xs text-muted-foreground cursor-pointer"
                                >
                                  Remember this name for next time
                                </Label>
                              </div>
                            )}

                            {/* Remember Issuer Alias Checkbox */}
                            {isAdminOrManager && cert.issuerTypeId && !cert.issuerAliasAutoMatched && (
                              <div className="sm:col-span-2 flex items-center space-x-2">
                                <Checkbox
                                  id={`remember-issuer-${cert.id}`}
                                  checked={cert.rememberIssuerAlias || false}
                                  onCheckedChange={(checked) => {
                                    handleFieldChange(cert.id, 'rememberIssuerAlias', checked ? 'true' : '');
                                  }}
                                />
                                <Label
                                  htmlFor={`remember-issuer-${cert.id}`}
                                  className="text-xs text-muted-foreground cursor-pointer"
                                >
                                  Remember this issuer for next time
                                </Label>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state when no certificates */}
            {certificates.length === 0 && !loadingCategories && (
              <div className="text-center py-8 text-muted-foreground border rounded-lg">
                <div className="text-4xl mb-3">📄</div>
                <p>Upload certificates above to get started</p>
                <p className="text-sm">We'll extract details automatically</p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || certificates.length === 0}
          >
            {isSubmitting ? 'Adding...' : `Save ${readyCount} Certificate(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
      
      <AmbiguityWarningDialog
        open={ambiguityWarningOpen}
        onOpenChange={setAmbiguityWarningOpen}
        normalizedTitle={pendingAmbiguousAlias?.normalizedTitle || ''}
        onConfirm={handleAmbiguityConfirm}
        onCancel={handleAmbiguityCancel}
      />
    </Dialog>
  );
}
