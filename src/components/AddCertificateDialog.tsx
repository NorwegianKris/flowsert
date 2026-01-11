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
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Award, Upload, X, FileText, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

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
  selected: boolean;
  file: File | null;
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
    field: 'dateOfIssue' | 'expiryDate' | 'placeOfIssue',
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
      selected: true,
      file: null,
    };
    setCertificates((prev) => [newCert, ...prev]);
    setCustomName('');
  };

  const handleSubmit = async () => {
    const toAdd = selectedCertificates.filter(
      (c) => c.dateOfIssue && c.placeOfIssue
    );

    if (toAdd.length === 0) {
      toast.error('Please select certificates and fill in required fields');
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
          selected: false,
          file: null,
        }))
      );
    } catch (error) {
      console.error('Error adding certificates:', error);
      toast.error('Failed to add certificates');
    } finally {
      setIsSubmitting(false);
    }
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

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
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

          {/* Certificate list */}
          <ScrollArea className="flex-1 border rounded-lg">
            <div className="p-4 space-y-4">
              {loadingCategories ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Loading categories...</span>
                </div>
              ) : certificates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No certificate categories defined.</p>
                  <p className="text-sm">Add a custom certificate below or contact your administrator.</p>
                </div>
              ) : certificates.map((cert) => (
                <div
                  key={cert.id}
                  className={`p-4 rounded-lg border transition-colors ${
                    cert.selected
                      ? 'border-primary bg-primary/5'
                      : 'border-border/50 hover:border-border'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={cert.selected}
                      onCheckedChange={() => handleToggle(cert.id)}
                      className="mt-1"
                    />
                    <div className="flex-1 space-y-3">
                      <span className="font-medium">{cert.name}</span>

                      {cert.selected && (
                        <div className="space-y-3">
                          <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">
                                Date of Issue *
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
                              <Label className="text-xs text-muted-foreground">
                                Expiry Date
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
                              <Label className="text-xs text-muted-foreground">
                                Place of Issue *
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
          </ScrollArea>

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
