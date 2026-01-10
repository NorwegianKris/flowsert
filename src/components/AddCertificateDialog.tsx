import { useState } from 'react';
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
import { Plus, Award } from 'lucide-react';

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
}

const COMMON_CERTIFICATES = [
  'STCW Basic Safety Training',
  'STCW Advanced Fire Fighting',
  'STCW Medical First Aid',
  'STCW Proficiency in Survival Craft',
  'STCW Personal Safety and Social Responsibilities',
  'GMDSS Radio Operator Certificate',
  'Ship Security Officer Certificate',
  'Crowd Management Certificate',
  'Crisis Management Certificate',
  'Medical Care Certificate',
  'Basic Oil Tanker Cargo Operations',
  'Advanced Oil Tanker Cargo Operations',
  'Basic Chemical Tanker Cargo Operations',
  'Advanced Chemical Tanker Cargo Operations',
  'Basic LPG Tanker Cargo Operations',
  'Advanced LPG Tanker Cargo Operations',
  'Dynamic Positioning Operator Certificate',
  'Helicopter Underwater Escape Training',
  'Offshore Safety Induction',
];

export function AddCertificateDialog({
  open,
  onOpenChange,
  personnelId,
  personnelName,
  onSuccess,
}: AddCertificateDialogProps) {
  const [certificates, setCertificates] = useState<CertificateEntry[]>(
    COMMON_CERTIFICATES.map((name, index) => ({
      id: `cert-${index}`,
      name,
      dateOfIssue: '',
      expiryDate: '',
      placeOfIssue: '',
      selected: false,
    }))
  );
  const [customName, setCustomName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleAddCustom = () => {
    if (!customName.trim()) return;
    const newCert: CertificateEntry = {
      id: `custom-${Date.now()}`,
      name: customName.trim(),
      dateOfIssue: '',
      expiryDate: '',
      placeOfIssue: '',
      selected: true,
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
      const { error } = await supabase.from('certificates').insert(
        toAdd.map((c) => ({
          personnel_id: personnelId,
          name: c.name,
          date_of_issue: c.dateOfIssue,
          expiry_date: c.expiryDate || null,
          place_of_issue: c.placeOfIssue,
        }))
      );

      if (error) throw error;

      toast.success(`${toAdd.length} certificate(s) added successfully`);
      onSuccess();
      onOpenChange(false);
      
      // Reset form
      setCertificates(
        COMMON_CERTIFICATES.map((name, index) => ({
          id: `cert-${index}`,
          name,
          dateOfIssue: '',
          expiryDate: '',
          placeOfIssue: '',
          selected: false,
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
              {certificates.map((cert) => (
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
