import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { StatusBadge } from '@/components/StatusBadge';
import { Certificate } from '@/types';
import {
  getCertificateStatus,
  getDaysUntilExpiry,
  formatExpiryText,
} from '@/lib/certificateUtils';
import { format, parseISO } from 'date-fns';
import { FileText } from 'lucide-react';

interface CertificateTableProps {
  certificates: Certificate[];
}

export function CertificateTable({ certificates }: CertificateTableProps) {
  const sortedCertificates = [...certificates].sort((a, b) => {
    const statusOrder = { expired: 0, expiring: 1, valid: 2 };
    const statusA = getCertificateStatus(a.expiryDate);
    const statusB = getCertificateStatus(b.expiryDate);
    return statusOrder[statusA] - statusOrder[statusB];
  });

  return (
    <div className="rounded-lg border border-border/50 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            <TableHead className="font-semibold">Certificate</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
            <TableHead className="font-semibold">Date of Issue</TableHead>
            <TableHead className="font-semibold">Expiry Date</TableHead>
            <TableHead className="font-semibold">Place of Issue</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedCertificates.map((cert) => {
            const status = getCertificateStatus(cert.expiryDate);
            const daysUntilExpiry = getDaysUntilExpiry(cert.expiryDate);

            return (
              <TableRow key={cert.id} className="group">
                <TableCell>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{cert.name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-0.5">
                    <StatusBadge status={status} showLabel />
                    <span className="text-xs text-muted-foreground">
                      {formatExpiryText(daysUntilExpiry)}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {format(parseISO(cert.dateOfIssue), 'dd MMM yyyy')}
                </TableCell>
                <TableCell>
                  {cert.expiryDate ? (
                    <span
                      className={
                        status === 'expired'
                          ? 'text-destructive font-medium'
                          : status === 'expiring'
                          ? 'text-[hsl(var(--status-warning))] font-medium'
                          : 'text-muted-foreground'
                      }
                    >
                      {format(parseISO(cert.expiryDate), 'dd MMM yyyy')}
                    </span>
                  ) : (
                    <span className="text-muted-foreground italic">No expiry</span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {cert.placeOfIssue}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
