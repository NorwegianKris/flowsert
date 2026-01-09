import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/StatusBadge';
import { Personnel } from '@/types';
import {
  getPersonnelOverallStatus,
  countCertificatesByStatus,
} from '@/lib/certificateUtils';
import { MapPin, Mail, Phone, FileCheck } from 'lucide-react';

interface PersonnelCardProps {
  personnel: Personnel;
  onClick: () => void;
}

export function PersonnelCard({ personnel, onClick }: PersonnelCardProps) {
  const overallStatus = getPersonnelOverallStatus(personnel);
  const certificateCounts = countCertificatesByStatus(personnel.certificates);
  const initials = personnel.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  return (
    <Card
      className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 border-border/50"
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <Avatar className="h-14 w-14 border-2 border-border">
            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-lg">
              {initials}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-foreground truncate">
                {personnel.name}
              </h3>
              <StatusBadge status={overallStatus} size="sm" />
            </div>
            
            <Badge variant="secondary" className="mb-3 font-normal">
              {personnel.role}
            </Badge>
            
            <div className="space-y-1.5 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">{personnel.location}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">{personnel.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                <span>{personnel.phone}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileCheck className="h-4 w-4" />
              <span>{personnel.certificates.length} Certificates</span>
            </div>
            
            <div className="flex items-center gap-3 text-xs">
              {certificateCounts.valid > 0 && (
                <span className="flex items-center gap-1">
                  <StatusBadge status="valid" size="sm" />
                  <span className="text-muted-foreground">{certificateCounts.valid}</span>
                </span>
              )}
              {certificateCounts.expiring > 0 && (
                <span className="flex items-center gap-1">
                  <StatusBadge status="expiring" size="sm" />
                  <span className="text-muted-foreground">{certificateCounts.expiring}</span>
                </span>
              )}
              {certificateCounts.expired > 0 && (
                <span className="flex items-center gap-1">
                  <StatusBadge status="expired" size="sm" />
                  <span className="text-muted-foreground">{certificateCounts.expired}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
