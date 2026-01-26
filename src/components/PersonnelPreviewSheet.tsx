import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Personnel } from '@/types';
import { MapPin, Mail, Phone, Briefcase, Calendar, Award, FileText, User, Building2 } from 'lucide-react';
import { format } from 'date-fns';

interface PersonnelPreviewSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  personnel: Personnel | null;
}

export function PersonnelPreviewSheet({ open, onOpenChange, personnel }: PersonnelPreviewSheetProps) {
  if (!personnel) return null;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getCertificateStatus = (expiryDate: string | null) => {
    if (!expiryDate) return { status: 'valid', label: 'No expiry' };
    const expiry = new Date(expiryDate);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) return { status: 'expired', label: 'Expired' };
    if (daysUntilExpiry <= 90) return { status: 'expiring', label: `${daysUntilExpiry}d left` };
    return { status: 'valid', label: 'Valid' };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'expired': return 'bg-red-500/10 text-red-600 border-red-500/30';
      case 'expiring': return 'bg-amber-500/10 text-amber-600 border-amber-500/30';
      default: return 'bg-green-500/10 text-green-600 border-green-500/30';
    }
  };

  const validCertificates = personnel.certificates?.filter(c => {
    if (!c.expiryDate) return true;
    return new Date(c.expiryDate) >= new Date();
  }) || [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader className="pb-4">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={personnel.avatarUrl} alt={personnel.name} />
              <AvatarFallback className="text-lg">{getInitials(personnel.name)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-xl">{personnel.name}</SheetTitle>
              <div className="flex items-center gap-2 flex-wrap mt-1">
                {personnel.isJobSeeker ? (
                  <Badge className="bg-violet-100 text-violet-700 border-violet-200">Job Seeker</Badge>
                ) : personnel.category === 'freelancer' ? (
                  <Badge variant="secondary">Freelancer</Badge>
                ) : (
                  <Badge variant="default">Fixed Employee</Badge>
                )}
                {personnel.department && (
                  <Badge variant="outline" className="text-xs">
                    {personnel.department}
                  </Badge>
                )}
              </div>
              <SheetDescription className="mt-1">{personnel.role || 'No role specified'}</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-200px)] pr-4">
          <div className="space-y-6">
            {/* Bio */}
            {personnel.bio && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  About
                </h4>
                <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                  {personnel.bio}
                </p>
              </div>
            )}

            {/* Contact Info */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                Contact
              </h4>
              <div className="grid gap-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-3.5 w-3.5" />
                  <span>{personnel.email}</span>
                </div>
                {personnel.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" />
                    <span>{personnel.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>{personnel.location}</span>
                </div>
              </div>
            </div>

            {/* Details */}
            {(personnel.nationality || personnel.language) && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  Details
                </h4>
                <div className="grid gap-2 text-sm">
                  {personnel.nationality && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Nationality</span>
                      <span>{personnel.nationality}</span>
                    </div>
                  )}
                  {personnel.language && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Language</span>
                      <span>{personnel.language}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Certificates */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Award className="h-4 w-4 text-muted-foreground" />
                Certificates
                {validCertificates.length > 0 && (
                  <Badge variant="secondary" className="text-xs ml-auto">
                    {validCertificates.length} valid
                  </Badge>
                )}
              </h4>
              {personnel.certificates && personnel.certificates.length > 0 ? (
                <div className="space-y-2">
                  {personnel.certificates.slice(0, 6).map((cert) => {
                    const { status, label } = getCertificateStatus(cert.expiryDate);
                    return (
                      <div 
                        key={cert.id} 
                        className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-sm"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{cert.name}</p>
                          {cert.expiryDate && (
                            <p className="text-xs text-muted-foreground">
                              Expires: {format(new Date(cert.expiryDate), 'MMM d, yyyy')}
                            </p>
                          )}
                        </div>
                        <Badge variant="outline" className={`text-[10px] ml-2 ${getStatusColor(status)}`}>
                          {label}
                        </Badge>
                      </div>
                    );
                  })}
                  {personnel.certificates.length > 6 && (
                    <p className="text-xs text-muted-foreground text-center">
                      +{personnel.certificates.length - 6} more certificates
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No certificates on file</p>
              )}
            </div>

            {/* Profile metadata */}
            <div className="pt-4 border-t text-xs text-muted-foreground space-y-1">
              {personnel.profileCode && (
                <div className="flex justify-between">
                  <span>Profile Code</span>
                  <span className="font-mono">{personnel.profileCode}</span>
                </div>
              )}
              {personnel.lastLoginAt && (
                <div className="flex justify-between">
                  <span>Last login</span>
                  <span>{format(new Date(personnel.lastLoginAt), 'MMM d, yyyy')}</span>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        <div className="pt-4 border-t mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">
            Back to Project
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
