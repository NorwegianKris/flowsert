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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { StatusBadge } from '@/components/StatusBadge';
import { Certificate, Personnel } from '@/types';
import {
  getCertificateStatus,
  getDaysUntilExpiry,
  formatExpiryText,
} from '@/lib/certificateUtils';
import { format, parseISO } from 'date-fns';
import { FileText, Award, Calendar, MapPin, Building2, ExternalLink, Image, File, Tag, ShieldAlert, User } from 'lucide-react';

interface CertificateWithPersonnel extends Certificate {
  personnelId: string;
  personnelName: string;
  personnelAvatarUrl?: string;
  personnelRole: string;
}

interface ProjectCertificateStatusProps {
  personnel: Personnel[];
}

export function ProjectCertificateStatus({ personnel }: ProjectCertificateStatusProps) {
  const [selectedCertificate, setSelectedCertificate] = useState<CertificateWithPersonnel | null>(null);

  // Collect all certificates from assigned personnel with personnel info
  const allCertificates: CertificateWithPersonnel[] = personnel.flatMap((person) =>
    person.certificates.map((cert) => ({
      ...cert,
      personnelId: person.id,
      personnelName: person.name,
      personnelAvatarUrl: person.avatarUrl,
      personnelRole: person.role,
    }))
  );

  // Sort by expiry date (soonest first, null/no expiry at the end)
  const sortedCertificates = [...allCertificates].sort((a, b) => {
    // Handle null expiry dates (no expiry) - put at the end
    if (!a.expiryDate && !b.expiryDate) return 0;
    if (!a.expiryDate) return 1;
    if (!b.expiryDate) return -1;
    
    // Sort by expiry date ascending (soonest first)
    return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
  });

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const isImageFile = (url: string) => {
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
  };

  const isPdfFile = (url: string) => {
    return /\.pdf$/i.test(url);
  };

  if (sortedCertificates.length === 0) {
    return (
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-primary" />
            Certificate Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="text-4xl mb-3">🏅</div>
            <p className="text-muted-foreground text-sm">
              No certificates found for assigned personnel
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-primary" />
            Certificate Status ({sortedCertificates.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border/50 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="font-semibold">Personnel</TableHead>
                  <TableHead className="font-semibold">Certificate</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Category</TableHead>
                  <TableHead className="font-semibold">Issuing Authority</TableHead>
                  <TableHead className="font-semibold">Date of Issue</TableHead>
                  <TableHead className="font-semibold">Expiry Date</TableHead>
                  <TableHead className="font-semibold">Place of Issue</TableHead>
                  <TableHead className="font-semibold">Document</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedCertificates.map((cert) => {
                  const status = getCertificateStatus(cert.expiryDate);
                  const daysUntilExpiry = getDaysUntilExpiry(cert.expiryDate);

                  return (
                    <TableRow 
                      key={`${cert.personnelId}-${cert.id}`}
                      className="group cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setSelectedCertificate(cert)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={cert.personnelAvatarUrl} alt={cert.personnelName} />
                            <AvatarFallback className="text-xs font-medium">
                              {getInitials(cert.personnelName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{cert.personnelName}</p>
                            <p className="text-xs text-muted-foreground truncate">{cert.personnelRole}</p>
                          </div>
                        </div>
                      </TableCell>
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
                      <TableCell className="text-muted-foreground">
                        {cert.placeOfIssue}
                      </TableCell>
                      <TableCell>
                        {cert.documentUrl ? (
                          <div className="flex items-center gap-1">
                            {isImageFile(cert.documentUrl) ? (
                              <Image className="h-4 w-4 text-primary" />
                            ) : (
                              <File className="h-4 w-4 text-primary" />
                            )}
                            <span className="text-xs text-primary">Attached</span>
                          </div>
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
        </CardContent>
      </Card>

      <Dialog open={!!selectedCertificate} onOpenChange={(open) => !open && setSelectedCertificate(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              Certificate Details
            </DialogTitle>
          </DialogHeader>
          
          {selectedCertificate && (
            <div className="space-y-6">
              {/* Personnel Info */}
              <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/30 border border-border/50">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={selectedCertificate.personnelAvatarUrl} alt={selectedCertificate.personnelName} />
                  <AvatarFallback className="text-sm font-medium">
                    {getInitials(selectedCertificate.personnelName)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    <span className="text-xs text-muted-foreground uppercase tracking-wide">Certificate Holder</span>
                  </div>
                  <p className="font-semibold text-foreground">{selectedCertificate.personnelName}</p>
                  <p className="text-sm text-muted-foreground">{selectedCertificate.personnelRole}</p>
                </div>
              </div>

              {/* Document Preview */}
              {selectedCertificate.documentUrl ? (
                <div className="border rounded-lg overflow-hidden bg-muted/20">
                  <div className="p-3 border-b bg-muted/30 flex items-center justify-between">
                    <span className="text-sm font-medium">Document Preview</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(selectedCertificate.documentUrl, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open Full Size
                    </Button>
                  </div>
                  <div className="p-4 flex justify-center">
                    {isImageFile(selectedCertificate.documentUrl) ? (
                      <img
                        src={selectedCertificate.documentUrl}
                        alt={`${selectedCertificate.name} document`}
                        className="max-h-[400px] object-contain rounded"
                      />
                    ) : isPdfFile(selectedCertificate.documentUrl) ? (
                      <iframe
                        src={selectedCertificate.documentUrl}
                        title={`${selectedCertificate.name} document`}
                        className="w-full h-[500px] rounded"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-4 py-8">
                        <File className="h-16 w-16 text-muted-foreground" />
                        <p className="text-muted-foreground">Document available</p>
                        <Button
                          variant="outline"
                          onClick={() => window.open(selectedCertificate.documentUrl, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Download Document
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Certificate Placeholder when no document */
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
                      No document uploaded for this certificate.
                    </p>
                  </div>
                </div>
              )}

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
                  <Tag className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">Category</div>
                    <div className="font-medium">{selectedCertificate.category || 'Uncategorized'}</div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/30">
                  <Building2 className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">Issuing Authority</div>
                    <div className="font-medium">{selectedCertificate.issuingAuthority || 'Not specified'}</div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/30">
                  <Award className="h-5 w-5 text-primary mt-0.5" />
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
