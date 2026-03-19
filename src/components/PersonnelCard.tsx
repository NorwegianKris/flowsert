import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/StatusBadge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Personnel } from '@/types';
import {
  getPersonnelOverallStatus,
  countCertificatesByStatus,
} from '@/lib/certificateUtils';
import { MapPin, Mail, Phone, FileCheck, Briefcase, Trash2, Loader2, ShieldCheck, ShieldOff, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';


interface PersonnelCardProps {
  personnel: Personnel;
  onClick: () => void;
  onRemoved?: () => void;
  highlighted?: boolean;
  isAdmin?: boolean;
}

// Calculate profile completion percentage based on required fields:
// name, role, nationality, gender, phone, email, location, certificates, documents
function calculateCompletion(personnel: Personnel, documentCount: number): { percentage: number; color: string } {
  const checks = [
    !!personnel.name && personnel.name.trim().length > 0,
    !!personnel.role && personnel.role.trim().length > 0,
    !!personnel.nationality,
    !!personnel.gender,
    !!personnel.phone && personnel.phone.trim().length > 0,
    !!personnel.email && personnel.email.trim().length > 0,
    !!personnel.location && personnel.location.trim().length > 0 && personnel.location !== 'Not specified',
    personnel.certificates.length > 0,
    documentCount > 0,
  ];
  
  const completed = checks.filter(Boolean).length;
  const percentage = Math.round((completed / checks.length) * 100);
  
  let color: string;
  if (percentage >= 80) {
    color = 'bg-[hsl(var(--status-valid))] text-[hsl(var(--status-valid-foreground))]';
  } else if (percentage >= 50) {
    color = 'bg-[hsl(var(--status-warning))] text-[hsl(var(--status-warning-foreground))]';
  } else {
    color = 'bg-destructive text-destructive-foreground';
  }
  
  return { percentage, color };
}

export function PersonnelCard({ personnel, onClick, onRemoved, highlighted, isAdmin }: PersonnelCardProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [documentCount, setDocumentCount] = useState(0);
  const { toast } = useToast();
  
  useEffect(() => {
    async function fetchDocumentCount() {
      const { count } = await supabase
        .from('personnel_documents')
        .select('*', { count: 'exact', head: true })
        .eq('personnel_id', personnel.id);
      setDocumentCount(count || 0);
    }
    fetchDocumentCount();
  }, [personnel.id]);
  
  const overallStatus = getPersonnelOverallStatus(personnel);
  const certificateCounts = countCertificatesByStatus(personnel.certificates);
  
  const initials = personnel.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  const handleRemoveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('personnel')
        .delete()
        .eq('id', personnel.id);

      if (error) throw error;

      toast({
        title: 'Personnel Removed',
        description: `${personnel.name} has been removed successfully.`,
      });

      onRemoved?.();
    } catch (error) {
      console.error('Error deleting personnel:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to remove personnel. Please try again.',
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const isFreelancer = personnel.category === 'freelancer';
  const isActivated = personnel.activated || false;

  return (
    <>
      <Card
        className={`h-full flex flex-col cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 hover:ring-2 hover:ring-[#C4B5FD] hover:shadow-[#C4B5FD]/20 group relative ${
          highlighted
            ? 'ring-2 ring-primary shadow-lg shadow-primary/20'
            : ''
        } ${
          isFreelancer 
            ? 'border-[#C4B5FD] bg-[#C4B5FD]/10 dark:bg-[#C4B5FD]/10 dark:border-[#C4B5FD]/50' 
            : 'border-border/50'
        }`}
        onClick={onClick}
      >
        {/* Remove button - visible on hover */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10 z-10"
          onClick={handleRemoveClick}
          title="Remove personnel"
        >
          <Trash2 className="h-4 w-4" />
        </Button>

        <CardContent className="p-5 flex-1 flex flex-col">
          <div className="flex items-start gap-4">
            <Avatar className="h-14 w-14 border-2 border-border">
              {personnel.avatarUrl && (
                <AvatarImage src={personnel.avatarUrl} alt={personnel.name} />
              )}
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
                {/* Activation status indicator - only for freelancers */}
                {isFreelancer && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className={`p-0.5 rounded ${isActivated ? 'text-primary' : 'text-muted-foreground'}`}>
                        {isActivated ? (
                          <ShieldCheck className="h-4 w-4" />
                        ) : (
                          <ShieldOff className="h-4 w-4" />
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      {isActivated ? 'Profile activated' : 'Profile not activated'}
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
              
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <Badge 
                  variant={personnel.category === 'freelancer' ? 'secondary' : 'default'}
                  className="font-normal"
                >
                  {personnel.category === 'freelancer' ? 'Freelancer' : 'Employee'}
                </Badge>
                {personnel.department && (
                  <Badge variant="outline" className="font-normal text-muted-foreground">
                    {personnel.department}
                  </Badge>
                )}
                {isAdmin && (
                  <Badge variant="outline" className="font-normal bg-primary/10 text-primary border-primary/30 ml-auto">
                    <Shield className="h-3 w-3 mr-1" />
                    Admin
                  </Badge>
                )}
              </div>
              
              <div className="space-y-1.5 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-3.5 w-3.5 flex-shrink-0 text-indigo-500" />
                  <span className="truncate">{personnel.role}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-rose-500" />
                  <span className="truncate">{personnel.location}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 flex-shrink-0 text-blue-500" />
                  <span className="truncate">{personnel.email}</span>
                </div>
                <div className="flex items-center gap-2 pb-3">
                  <Phone className="h-3.5 w-3.5 flex-shrink-0 text-emerald-500" />
                  <span>{personnel.phone}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Skills preview */}
          <div className="mt-3 min-h-[32px] flex flex-wrap gap-1">
            {personnel.skills && personnel.skills.length > 0 && (
              <>
                {personnel.skills.slice(0, 3).map(skill => (
                  <Badge key={skill} variant="secondary" className="text-[10px] px-1.5 py-0">
                    {skill}
                  </Badge>
                ))}
                {personnel.skills.length > 3 && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                    +{personnel.skills.length - 3}
                  </Badge>
                )}
              </>
            )}
          </div>

          <div className="mt-auto pt-4 border-t border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileCheck className="h-4 w-4 text-blue-500" />
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

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Personnel</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{personnel.name}</strong>? 
              This action cannot be undone and will also remove all their certificates and documents.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>No</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Removing...
                </>
              ) : (
                'Yes'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
