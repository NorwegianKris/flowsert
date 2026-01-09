import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { StatusBadge } from '@/components/StatusBadge';
import { Certificate } from '@/types';
import {
  getCertificateStatus,
  getDaysUntilExpiry,
  formatExpiryText,
} from '@/lib/certificateUtils';
import { format, parseISO } from 'date-fns';
import { FileText, Award, Calendar, MapPin, Building2 } from 'lucide-react';

interface CertificateTableProps {
  certificates: Certificate[];
}

export function CertificateTable({ certificates }: CertificateTableProps) {
  const [selectedCertificate, setSelectedCertificate] = useState<Certificate | null>(null);

  const sortedCertificates = [...certificates].sort((a, b) => {
    const statusOrder = { expired: 0, expiring: 1, valid: 2 };
    const statusA = getCertificateStatus(a.expiryDate);
    const statusB = getCertificateStatus(b.expiryDate);
    return statusOrder[statusA] - statusOrder[statusB];
  });

  return (
    <>
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
                <TableRow 
                  key={cert.id} 
                  className="group cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setSelectedCertificate(cert)}
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

      <Dialog open={!!selectedCertificate} onOpenChange={(open) => !open && setSelectedCertificate(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              Certificate Details
            </DialogTitle>
          </DialogHeader>
          
          {selectedCertificate && (
            <div className="space-y-6">
              {/* Certificate Preview */}
              <div className="bg-gradient-to-br from-primary/5 to-primary/10 border-2 border-primary/20 rounded-lg p-8 relative overflow-hidden">
                <div className="absolute top-4 right-4 opacity-10">
                  <Award className="h-24 w-24 text-primary" />
                </div>
                
                <div className="text-center space-y-4 relative z-10">
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">
                    Certificate of Competency
                  </div>
                  <h2 className="text-2xl font-bold text-foreground">
                    {selectedCertificate.name}
                  </h2>
                  <div className="w-24 h-0.5 bg-primary/30 mx-auto" />
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    This is to certify that the holder has successfully completed all requirements
                    and is authorized to perform duties as specified by this certificate.
                  </p>
                </div>
              </div>

              {/* Certificate Details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/30">
                  <Calendar className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">Date of Issue</div>
                    <div className="font-medium">
                      {format(parseISO(selectedCertificate.dateOfIssue), 'dd MMMM yyyy')}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/30">
                  <Calendar className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">Expiry Date</div>
                    <div className="font-medium">
                      {selectedCertificate.expiryDate 
                        ? format(parseISO(selectedCertificate.expiryDate), 'dd MMMM yyyy')
                        : 'No expiry'}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/30">
                  <MapPin className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">Place of Issue</div>
                    <div className="font-medium">{selectedCertificate.placeOfIssue}</div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/30">
                  <Building2 className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">Status</div>
                    <StatusBadge status={getCertificateStatus(selectedCertificate.expiryDate)} showLabel />
                  </div>
                </div>
              </div>

              {/* Certificate ID */}
              <div className="text-center text-xs text-muted-foreground border-t pt-4">
                Certificate ID: {selectedCertificate.id}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}