import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/StatusBadge';
import { getCertificateStatus, formatExpiryText, getDaysUntilExpiry } from '@/lib/certificateUtils';
import { format, parseISO } from 'date-fns';

interface ExistingCert {
  id: string;
  name: string;
  date_of_issue: string;
  expiry_date: string | null;
}

interface NewCertInfo {
  name: string;
  dateOfIssue: string;
  expiryDate: string | null;
}

interface DuplicateCertificateDialogProps {
  open: boolean;
  existingCerts: ExistingCert[];
  newCert: NewCertInfo;
  onReplace: () => void;
  onKeepBoth: () => void;
  onCancel: () => void;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  try {
    return format(parseISO(dateStr), 'dd MMM yyyy');
  } catch {
    return dateStr;
  }
}

export function DuplicateCertificateDialog({
  open,
  existingCerts,
  newCert,
  onReplace,
  onKeepBoth,
  onCancel,
}: DuplicateCertificateDialogProps) {
  const oldest = existingCerts.length > 0
    ? existingCerts.reduce((a, b) => (a.date_of_issue < b.date_of_issue ? a : b))
    : null;

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Duplicate certificate detected</AlertDialogTitle>
          <AlertDialogDescription>
            This person already has {existingCerts.length === 1 ? 'a' : existingCerts.length}{' '}
            <span className="font-semibold text-foreground">{newCert.name}</span> certificate{existingCerts.length > 1 ? 's' : ''} on file.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3">
          {/* Existing certificates */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Existing</p>
            <div className="space-y-1.5">
              {existingCerts.map((cert) => {
                const status = getCertificateStatus(cert.expiry_date);
                const days = getDaysUntilExpiry(cert.expiry_date);
                return (
                  <div key={cert.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={status} size="sm" />
                      <span>Issued {formatDate(cert.date_of_issue)}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatExpiryText(days)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* New certificate */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">New upload</p>
            <div className="flex items-center justify-between rounded-md border border-primary/30 bg-primary/5 p-2 text-sm">
              <div className="flex items-center gap-2">
                <StatusBadge status={getCertificateStatus(newCert.expiryDate)} size="sm" />
                <span>Issued {formatDate(newCert.dateOfIssue)}</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {formatExpiryText(getDaysUntilExpiry(newCert.expiryDate))}
              </span>
            </div>
          </div>
        </div>

        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onCancel} className="sm:order-1">
            Cancel
          </Button>
          <Button variant="secondary" onClick={onKeepBoth} className="sm:order-2">
            Keep both
          </Button>
          {oldest && (
            <Button variant="default" onClick={onReplace} className="sm:order-3">
              Replace oldest
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
