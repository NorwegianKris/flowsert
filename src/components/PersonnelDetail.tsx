import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/StatusBadge';
import { CertificateTable } from '@/components/CertificateTable';
import { Personnel } from '@/types';
import {
  getPersonnelOverallStatus,
  countCertificatesByStatus,
} from '@/lib/certificateUtils';
import { ArrowLeft, MapPin, Mail, Phone, FileCheck, AlertTriangle, CheckCircle } from 'lucide-react';

interface PersonnelDetailProps {
  personnel: Personnel;
  onBack: () => void;
}

export function PersonnelDetail({ personnel, onBack }: PersonnelDetailProps) {
  const overallStatus = getPersonnelOverallStatus(personnel);
  const certificateCounts = countCertificatesByStatus(personnel.certificates);
  const initials = personnel.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        onClick={onBack}
        className="gap-2 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Personnel
      </Button>

      <Card className="border-border/50">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-start gap-6">
            <Avatar className="h-24 w-24 border-4 border-border">
              <AvatarFallback className="bg-primary/10 text-primary font-bold text-2xl">
                {initials}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 space-y-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold text-foreground">
                    {personnel.name}
                  </h1>
                  <StatusBadge status={overallStatus} showLabel size="lg" />
                </div>
                <Badge variant="secondary" className="text-sm font-normal">
                  {personnel.role}
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span>{personnel.location}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4 text-primary" />
                  <span>{personnel.email}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4 text-primary" />
                  <span>{personnel.phone}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <FileCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {personnel.certificates.length}
              </p>
              <p className="text-xs text-muted-foreground">Total Certificates</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[hsl(var(--status-valid))]/10">
              <CheckCircle className="h-5 w-5 text-[hsl(var(--status-valid))]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {certificateCounts.valid}
              </p>
              <p className="text-xs text-muted-foreground">Valid</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[hsl(var(--status-warning))]/10">
              <AlertTriangle className="h-5 w-5 text-[hsl(var(--status-warning))]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {certificateCounts.expiring}
              </p>
              <p className="text-xs text-muted-foreground">Expiring Soon</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {certificateCounts.expired}
              </p>
              <p className="text-xs text-muted-foreground">Expired</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Certificates</CardTitle>
        </CardHeader>
        <CardContent>
          <CertificateTable certificates={personnel.certificates} />
        </CardContent>
      </Card>
    </div>
  );
}
