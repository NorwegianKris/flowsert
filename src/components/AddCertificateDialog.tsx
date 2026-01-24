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

import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Award, Upload, X, FileText, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { SmartCertificateUpload } from './SmartCertificateUpload';
import { ExtractionResult } from '@/types/certificateExtraction';
import { cn } from '@/lib/utils';

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
  selected: boolean;
  file: File | null;
  // OCR tracking
  wasAutoFilled?: boolean;
  fieldConfidence?: {
    dateOfIssue?: 'high' | 'medium' | 'low';
    expiryDate?: 'high' | 'medium' | 'low';
    placeOfIssue?: 'high' | 'medium' | 'low';
    issuingAuthority?: 'high' | 'medium' | 'low';
  };
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
  const { businessId } = useAuth();
  const [categories, setCategories] = useState<CertificateCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [certificates, setCertificates] = useState<CertificateEntry[]>([]);
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const [customName, setCustomName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastExtractionResult, setLastExtractionResult] = useState<ExtractionResult | null>(null);

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
        
        // Initialize certificates from categories
        setCertificates(
          (data || []).map((cat) => ({
            id: cat.id,
            name: cat.name,
            dateOfIssue: '',
            expiryDate: '',
            placeOfIssue: '',
            issuingAuthority: '',
            selected: false,
            file: null,
          }))
        );
      } catch (error) {
        console.error('Error fetching certificate categories:', error);
        toast.error('Failed to load certificate categories');
      } finally {
        setLoadingCategories(false);
      }
    };

    if (open) {
      fetchCategories();
      setLastExtractionResult(null);
    }
  }, [businessId, open]);

  const selectedCertificates = certificates.filter((c) => c.selected);

  const handleToggle = (id: string) => {
    setCertificates((prev) =>
      prev.map((c) => (c.id === id ? { ...c, selected: !c.selected } : c))
    );
  };

  const handleFieldChange = (
    id: string,
    field: 'dateOfIssue' | 'expiryDate' | 'placeOfIssue' | 'issuingAuthority',
    value: string
  ) => {
    setCertificates((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  const handleFileChange = (id: string, file: File | null) => {
    setCertificates((prev) =>
      prev.map((c) => (c.id === id ? { ...c, file } : c))
    );
  };

  const handleRemoveFile = (id: string) => {
    setCertificates((prev) =>
      prev.map((c) => (c.id === id ? { ...c, file: null } : c))
    );
    if (fileInputRefs.current[id]) {
      fileInputRefs.current[id]!.value = '';
    }
  };

  const handleAddCustom = () => {
    if (!customName.trim()) return;
    const newCert: CertificateEntry = {
      id: `custom-${Date.now()}`,
      name: customName.trim(),
      dateOfIssue: '',
      expiryDate: '',
      placeOfIssue: '',
      issuingAuthority: '',
      selected: true,
      file: null,
    };
    setCertificates((prev) => [newCert, ...prev]);
    setCustomName('');
  };

  // Handle OCR extraction result
  const handleExtractionComplete = (result: ExtractionResult, file: File) => {
    setLastExtractionResult(result);
    const { extractedData } = result;

    // Determine confidence levels based on overall result
    const getConfidence = (status: string): 'high' | 'medium' | 'low' => {
      if (result.status === 'green') return 'high';
      if (result.status === 'amber') return 'medium';
      return 'low';
    };

    if (result.status === 'red') {
      // Red status - create a new custom entry with the file but no data
      const newCert: CertificateEntry = {
        id: `custom-${Date.now()}`,
        name: '',
        dateOfIssue: '',
        expiryDate: '',
        placeOfIssue: '',
        issuingAuthority: '',
        selected: true,
        file,
      };
      setCertificates((prev) => [newCert, ...prev]);
      return;
    }

    // Check if we have a matched category
    if (extractedData.matchedCategoryId) {
      // Update the matching category entry
      setCertificates((prev) =>
        prev.map((c) => {
          if (c.id === extractedData.matchedCategoryId) {
            return {
              ...c,
              selected: true,
              dateOfIssue: extractedData.dateOfIssue || '',
              expiryDate: extractedData.expiryDate || '',
              placeOfIssue: extractedData.placeOfIssue || '',
              issuingAuthority: extractedData.issuingAuthority || '',
              file,
              wasAutoFilled: true,
              fieldConfidence: {
                dateOfIssue: extractedData.dateOfIssue ? getConfidence(result.status) : undefined,
                expiryDate: extractedData.expiryDate ? getConfidence(result.status) : undefined,
                placeOfIssue: extractedData.placeOfIssue ? getConfidence(result.status) : undefined,
                issuingAuthority: extractedData.issuingAuthority ? getConfidence(result.status) : undefined,
              },
            };
          }
          return c;
        })
      );
    } else {
      // Create a new custom certificate with extracted data
      const newCert: CertificateEntry = {
        id: `custom-${Date.now()}`,
        name: extractedData.certificateName || '',
        dateOfIssue: extractedData.dateOfIssue || '',
        expiryDate: extractedData.expiryDate || '',
        placeOfIssue: extractedData.placeOfIssue || '',
        issuingAuthority: extractedData.issuingAuthority || '',
        selected: true,
        file,
        wasAutoFilled: true,
        fieldConfidence: {
          dateOfIssue: extractedData.dateOfIssue ? getConfidence(result.status) : undefined,
          expiryDate: extractedData.expiryDate ? getConfidence(result.status) : undefined,
          placeOfIssue: extractedData.placeOfIssue ? getConfidence(result.status) : undefined,
          issuingAuthority: extractedData.issuingAuthority ? getConfidence(result.status) : undefined,
        },
      };
      setCertificates((prev) => [newCert, ...prev]);
    }
  };

  const handleSubmit = async () => {
    const toAdd = selectedCertificates.filter(
      (c) => c.dateOfIssue && c.placeOfIssue && c.issuingAuthority
    );

    if (toAdd.length === 0) {
      toast.error('Please select certificates and fill in required fields (Date of Issue, Place of Issue, Issuing Authority)');
      return;
    }

    setIsSubmitting(true);

    try {
      // Insert certificates one by one to handle file uploads
      for (const cert of toAdd) {
        // First insert the certificate to get its ID
        const { data: insertedCert, error: insertError } = await supabase
          .from('certificates')
          .insert({
            personnel_id: personnelId,
            name: cert.name,
            date_of_issue: cert.dateOfIssue,
            expiry_date: cert.expiryDate || null,
            place_of_issue: cert.placeOfIssue,
            issuing_authority: cert.issuingAuthority,
            category_id: cert.id.startsWith('custom-') ? null : cert.id,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        // If there's a file, upload it and update the certificate
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

          // Get public URL and update certificate
          const { data: urlData } = supabase.storage
            .from('certificate-documents')
            .getPublicUrl(filePath);

          await supabase
            .from('certificates')
            .update({ document_url: urlData.publicUrl })
            .eq('id', insertedCert.id);
        }
      }

      toast.success(`${toAdd.length} certificate(s) added successfully`);
      onSuccess();
      onOpenChange(false);
      
      // Reset form
      setCertificates(
        categories.map((cat) => ({
          id: cat.id,
          name: cat.name,
          dateOfIssue: '',
          expiryDate: '',
          placeOfIssue: '',
          issuingAuthority: '',
          selected: false,
          file: null,
        }))
      );
      setLastExtractionResult(null);
    } catch (error) {
      console.error('Error adding certificates:', error);
      toast.error('Failed to add certificates');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to render field confidence indicator
  const renderFieldIndicator = (confidence?: 'high' | 'medium' | 'low') => {
    if (!confidence) return null;
    
    if (confidence === 'high') {
      return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />;
    }
    if (confidence === 'medium') {
      return <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />;
    }
    return null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            Add Certificates for {personnelName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 min-h-0 overflow-hidden flex flex-col">
          {/* Smart Upload Section */}
          <SmartCertificateUpload
            existingCategories={categories}
            onExtractionComplete={handleExtractionComplete}
            disabled={loadingCategories}
          />

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or select from categories
              </span>
            </div>
          </div>

          {/* Custom certificate input */}
          <div className="flex gap-2">
            <Input
              placeholder="Add custom certificate name..."
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddCustom()}
            />
            <Button variant="outline" size="icon" onClick={handleAddCustom}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Certificate list - using native scroll for reliability */}
          <div className="flex-1 min-h-0 overflow-y-auto border rounded-lg">
            <div className="p-4 space-y-4">
              {loadingCategories ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Loading categories...</span>
                </div>
              ) : certificates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <div className="text-4xl mb-3">📋</div>
                  <p>No certificate categories defined.</p>
                  <p className="text-sm">Add a custom certificate above or contact your administrator.</p>
                </div>
              ) : certificates.map((cert) => (
                <div
                  key={cert.id}
                  className={cn(
                    "p-4 rounded-lg border transition-colors",
                    cert.selected
                      ? cert.wasAutoFilled
                        ? 'border-green-500/50 bg-green-500/5'
                        : 'border-primary bg-primary/5'
                      : 'border-border/50 hover:border-border'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={cert.selected}
                      onCheckedChange={() => handleToggle(cert.id)}
                      className="mt-1"
                    />
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{cert.name || 'New Certificate'}</span>
                        {cert.wasAutoFilled && (
                          <span className="text-xs bg-green-500/10 text-green-600 px-2 py-0.5 rounded-full">
                            Auto-filled
                          </span>
                        )}
                      </div>

                      {/* Editable name for custom certificates */}
                      {cert.id.startsWith('custom-') && cert.selected && (
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">
                            Certificate Name *
                          </Label>
                          <Input
                            value={cert.name}
                            onChange={(e) =>
                              setCertificates((prev) =>
                                prev.map((c) =>
                                  c.id === cert.id ? { ...c, name: e.target.value } : c
                                )
                              )
                            }
                            placeholder="Certificate name"
                          />
                        </div>
                      )}

                      {cert.selected && (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                                Date of Issue *
                                {renderFieldIndicator(cert.fieldConfidence?.dateOfIssue)}
                              </Label>
                              <Input
                                type="date"
                                value={cert.dateOfIssue}
                                onChange={(e) =>
                                  handleFieldChange(
                                    cert.id,
                                    'dateOfIssue',
                                    e.target.value
                                  )
                                }
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                                Expiry Date
                                {renderFieldIndicator(cert.fieldConfidence?.expiryDate)}
                              </Label>
                              <Input
                                type="date"
                                value={cert.expiryDate}
                                onChange={(e) =>
                                  handleFieldChange(
                                    cert.id,
                                    'expiryDate',
                                    e.target.value
                                  )
                                }
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                                Place of Issue *
                                {renderFieldIndicator(cert.fieldConfidence?.placeOfIssue)}
                              </Label>
                              <Input
                                placeholder="e.g., Norway"
                                value={cert.placeOfIssue}
                                onChange={(e) =>
                                  handleFieldChange(
                                    cert.id,
                                    'placeOfIssue',
                                    e.target.value
                                  )
                                }
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                                Issuing Authority *
                                {renderFieldIndicator(cert.fieldConfidence?.issuingAuthority)}
                              </Label>
                              <Input
                                placeholder="e.g., DNV, Lloyd's Register"
                                value={cert.issuingAuthority}
                                onChange={(e) =>
                                  handleFieldChange(
                                    cert.id,
                                    'issuingAuthority',
                                    e.target.value
                                  )
                                }
                              />
                            </div>
                          </div>
                          
                          {/* File upload */}
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">
                              Document (PDF or Image)
                            </Label>
                            {cert.file ? (
                              <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50 border border-border">
                                <FileText className="h-4 w-4 text-primary" />
                                <span className="text-sm flex-1 truncate">{cert.file.name}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => handleRemoveFile(cert.id)}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <input
                                  type="file"
                                  accept=".pdf,.jpg,.jpeg,.png"
                                  className="hidden"
                                  ref={(el) => (fileInputRefs.current[cert.id] = el)}
                                  onChange={(e) => {
                                    const file = e.target.files?.[0] || null;
                                    handleFileChange(cert.id, file);
                                  }}
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => fileInputRefs.current[cert.id]?.click()}
                                >
                                  <Upload className="h-4 w-4 mr-2" />
                                  Upload Document
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            {selectedCertificates.length} certificate(s) selected
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || selectedCertificates.length === 0}
          >
            {isSubmitting ? 'Adding...' : `Add ${selectedCertificates.length} Certificate(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
