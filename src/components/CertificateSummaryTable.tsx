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
import { FileText, Tag, Lock, ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface CertificateSummaryTableProps {
  certificates: Certificate[];
}

/**
 * A read-only summary view of certificates for job seeker/applicant profiles.
 * Shows only metadata - no document access, no editing, no export.
 */
export function CertificateSummaryTable({ certificates }: CertificateSummaryTableProps) {
  const sortedCertificates = [...certificates].sort((a, b) => {
    const statusOrder = { expired: 0, expiring: 1, valid: 2 };
    const statusA = getCertificateStatus(a.expiryDate);
    const statusB = getCertificateStatus(b.expiryDate);
    return statusOrder[statusA] - statusOrder[statusB];
  });

  if (certificates.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>No certificates on file</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Access Restriction Notice */}
      <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border/50">
        <ShieldAlert className="h-5 w-5 text-muted-foreground shrink-0" />
        <div className="text-sm text-muted-foreground">
          <span className="font-medium">Limited Access:</span> Document viewing is restricted for applicant profiles. 
          Convert to active personnel to access full certificate documents.
        </div>
      </div>

      <div className="rounded-lg border border-border/50 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead className="font-semibold">Certificate</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold">Category</TableHead>
              <TableHead className="font-semibold">Issuing Authority</TableHead>
              <TableHead className="font-semibold">Date of Issue</TableHead>
              <TableHead className="font-semibold">Expiry Date</TableHead>
              <TableHead className="font-semibold">Document</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedCertificates.map((cert) => {
              const status = getCertificateStatus(cert.expiryDate);
              const daysUntilExpiry = getDaysUntilExpiry(cert.expiryDate);

              return (
                <TableRow 
                  key={cert.id} 
                  className="hover:bg-muted/30 transition-colors"
                >
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
                  <TableCell>
                    {cert.category ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                        <Tag className="h-3 w-3" />
                        {cert.category}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">Uncategorized</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {cert.issuingAuthority || <span className="italic">Not specified</span>}
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
                  <TableCell>
                    {cert.documentUrl ? (
                      <Badge variant="secondary" className="gap-1">
                        <Lock className="h-3 w-3" />
                        Restricted
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">None</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 pt-2">
        <div className="text-center p-3 rounded-lg bg-muted/30">
          <div className="text-2xl font-bold text-foreground">{certificates.length}</div>
          <div className="text-xs text-muted-foreground">Total Certificates</div>
        </div>
        <div className="text-center p-3 rounded-lg bg-muted/30">
          <div className="text-2xl font-bold text-[hsl(var(--status-valid))]">
            {certificates.filter(c => getCertificateStatus(c.expiryDate) === 'valid').length}
          </div>
          <div className="text-xs text-muted-foreground">Valid</div>
        </div>
        <div className="text-center p-3 rounded-lg bg-muted/30">
          <div className="text-2xl font-bold text-destructive">
            {certificates.filter(c => getCertificateStatus(c.expiryDate) === 'expired').length}
          </div>
          <div className="text-xs text-muted-foreground">Expired</div>
        </div>
      </div>
    </div>
  );
}
