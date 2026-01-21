import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { StatusBadge } from '@/components/StatusBadge';
import { Certificate } from '@/types';
import { getCertificateStatus } from '@/lib/certificateUtils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Trash2, AlertTriangle } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface RemoveCertificateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  certificates: Certificate[];
  personnelName: string;
  onSuccess: () => void;
}

export function RemoveCertificateDialog({
  open,
  onOpenChange,
  certificates,
  personnelName,
  onSuccess,
}: RemoveCertificateDialogProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleToggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === certificates.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(certificates.map((c) => c.id)));
    }
  };

  const handleRemove = async () => {
    if (selectedIds.size === 0) return;

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('certificates')
        .delete()
        .in('id', Array.from(selectedIds));

      if (error) throw error;

      toast.success(`${selectedIds.size} certificate(s) removed successfully`);
      onSuccess();
      onOpenChange(false);
      setSelectedIds(new Set());
      setShowConfirm(false);
    } catch (error) {
      console.error('Error removing certificates:', error);
      toast.error('Failed to remove certificates');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setSelectedIds(new Set());
    setShowConfirm(false);
  };

  if (showConfirm) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Confirm Removal
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {selectedIds.size} certificate(s) from{' '}
              {personnelName}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 space-y-2">
            {certificates
              .filter((c) => selectedIds.has(c.id))
              .map((cert) => (
                <div key={cert.id} className="text-sm">
                  • {cert.name}
                </div>
              ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemove}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Removing...' : 'Remove Certificates'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            Remove Certificates from {personnelName}
          </DialogTitle>
        </DialogHeader>

        {certificates.length === 0 ? (
          <div className="py-8 text-center">
            <div className="text-4xl mb-3">🎓</div>
            <p className="text-muted-foreground">No certificates to remove</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 pb-2 border-b">
              <Checkbox
                checked={selectedIds.size === certificates.length}
                onCheckedChange={handleSelectAll}
              />
              <span className="text-sm text-muted-foreground">
                Select all ({certificates.length})
              </span>
            </div>

            <ScrollArea className="flex-1 border rounded-lg">
              <div className="p-4 space-y-2">
                {certificates.map((cert) => {
                  const status = getCertificateStatus(cert.expiryDate);
                  const isSelected = selectedIds.has(cert.id);

                  return (
                    <div
                      key={cert.id}
                      className={`p-4 rounded-lg border transition-colors cursor-pointer ${
                        isSelected
                          ? 'border-destructive bg-destructive/5'
                          : 'border-border/50 hover:border-border'
                      }`}
                      onClick={() => handleToggle(cert.id)}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleToggle(cert.id)}
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{cert.name}</span>
                            <StatusBadge status={status} showLabel />
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            Issued: {format(parseISO(cert.dateOfIssue), 'dd MMM yyyy')}
                            {cert.expiryDate && (
                              <> • Expires: {format(parseISO(cert.expiryDate), 'dd MMM yyyy')}</>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            <div className="text-sm text-muted-foreground">
              {selectedIds.size} certificate(s) selected for removal
            </div>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => setShowConfirm(true)}
            disabled={selectedIds.size === 0}
          >
            Remove {selectedIds.size} Certificate(s)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
