import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Certificate } from '@/types';
import { EditCertificateDialog } from './EditCertificateDialog';
import { getCertificateStatus } from '@/lib/certificateUtils';
import { StatusBadge } from '@/components/StatusBadge';
import { FileText, Pencil } from 'lucide-react';

interface EditCertificateSelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  certificates: Certificate[];
  personnelName: string;
  onSuccess?: () => void;
}

export function EditCertificateSelectDialog({
  open,
  onOpenChange,
  certificates,
  personnelName,
  onSuccess,
}: EditCertificateSelectDialogProps) {
  const [selectedCertificate, setSelectedCertificate] = useState<Certificate | null>(null);

  const handleSelectCertificate = (cert: Certificate) => {
    setSelectedCertificate(cert);
  };

  const handleEditSuccess = () => {
    setSelectedCertificate(null);
    onOpenChange(false);
    onSuccess?.();
  };

  return (
    <>
      <Dialog open={open && !selectedCertificate} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" />
              Edit Certificate for {personnelName}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            <p className="text-sm text-muted-foreground mb-4">
              Select a certificate to edit:
            </p>
            {certificates.map((cert) => {
              const status = getCertificateStatus(cert.expiryDate);
              return (
                <Button
                  key={cert.id}
                  variant="outline"
                  className="w-full justify-start gap-3 h-auto py-3"
                  onClick={() => handleSelectCertificate(cert)}
                >
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 text-left">
                    <div className="font-medium">{cert.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {cert.category || 'Uncategorized'}
                    </div>
                  </div>
                  <StatusBadge status={status} />
                </Button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      <EditCertificateDialog
        open={!!selectedCertificate}
        onOpenChange={(open) => !open && setSelectedCertificate(null)}
        certificate={selectedCertificate}
        onSuccess={handleEditSuccess}
      />
    </>
  );
}
