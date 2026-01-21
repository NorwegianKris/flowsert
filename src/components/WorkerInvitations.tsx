import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { useProjectInvitations, ProjectInvitation } from '@/hooks/useProjectInvitations';
import { Mail, Check, X, FolderOpen, Clock, MapPin, Calendar, FileText, Hash, Building, User, Briefcase } from 'lucide-react';
import { useState } from 'react';
import { format, differenceInDays } from 'date-fns';

interface WorkerInvitationsProps {
  personnelId: string;
}

export function WorkerInvitations({ personnelId }: WorkerInvitationsProps) {
  const { invitations, respondToInvitation, loading } = useProjectInvitations();
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [selectedInvitation, setSelectedInvitation] = useState<ProjectInvitation | null>(null);

  const pendingInvitations = invitations.filter(
    (inv) => inv.personnelId === personnelId && inv.status === 'pending'
  );

  const handleRespond = async (invitationId: string, accept: boolean, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setRespondingId(invitationId);
    await respondToInvitation(invitationId, accept);
    setRespondingId(null);
    setSelectedInvitation(null);
  };

  const getProjectDuration = (startDate?: string, endDate?: string) => {
    if (!startDate) return null;
    if (!endDate) return 'Ongoing';
    const days = differenceInDays(new Date(endDate), new Date(startDate));
    if (days < 7) return `${days} days`;
    if (days < 30) return `${Math.ceil(days / 7)} weeks`;
    return `${Math.ceil(days / 30)} months`;
  };

  const getStatusBadgeVariant = (status?: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'completed':
        return 'secondary';
      case 'pending':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  if (loading) {
    return null;
  }

  return (
    <>
      <Card className="border-border/50 border-primary/30 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Mail className="h-5 w-5 text-orange-500" />
            Project Invitations
            <Badge variant="secondary" className="ml-2">
              {pendingInvitations.length} pending
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingInvitations.length === 0 ? (
            <div className="text-center py-4">
              <div className="text-3xl mb-2">✉️</div>
              <p className="text-sm text-muted-foreground">No pending invitations</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingInvitations.map((invitation) => (
                <div
                  key={invitation.id}
                  onClick={() => setSelectedInvitation(invitation)}
                  className="flex items-center justify-between gap-4 p-3 rounded-lg bg-background border border-border/50 cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <FolderOpen className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">
                        {invitation.projectName || 'Project Invitation'}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>
                          Invited {new Date(invitation.invitedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      onClick={(e) => handleRespond(invitation.id, false, e)}
                      disabled={respondingId === invitation.id}
                      className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Decline
                    </Button>
                    <Button
                      size="sm"
                      variant="active"
                      onClick={(e) => handleRespond(invitation.id, true, e)}
                      disabled={respondingId === invitation.id}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Accept
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invitation Detail Dialog */}
      <Dialog open={!!selectedInvitation} onOpenChange={(open) => !open && setSelectedInvitation(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-primary" />
              {selectedInvitation?.projectName || 'Project'} - Invitation
            </DialogTitle>
            <DialogDescription>
              You have been invited to join this project
            </DialogDescription>
          </DialogHeader>

          {selectedInvitation && (
            <div className="space-y-4">
              {/* Project Number and Status */}
              <div className="flex items-center justify-between gap-4">
                {selectedInvitation.projectNumber && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Hash className="h-3 w-3" />
                    Project #{selectedInvitation.projectNumber}
                  </p>
                )}
                {!selectedInvitation.projectNumber && <div />}
                {selectedInvitation.projectStatus && (
                  <Badge variant={getStatusBadgeVariant(selectedInvitation.projectStatus)}>
                    {selectedInvitation.projectStatus.charAt(0).toUpperCase() + selectedInvitation.projectStatus.slice(1)}
                  </Badge>
                )}
              </div>

              {/* Project Description */}
              <div className="space-y-1.5 p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <FileText className="h-4 w-4 text-primary" />
                  Description
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {selectedInvitation.projectDescription || 'No description provided'}
                </p>
              </div>

              <Separator />

              {/* Project Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                {/* Customer */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Building className="h-3.5 w-3.5" />
                    Customer
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    {selectedInvitation.projectCustomer || '—'}
                  </p>
                </div>

                {/* Project Manager */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <User className="h-3.5 w-3.5" />
                    Project Manager
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    {selectedInvitation.projectManager || '—'}
                  </p>
                </div>

                {/* Location */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    Location
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    {selectedInvitation.projectLocation || '—'}
                  </p>
                </div>

                {/* Work Category */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Briefcase className="h-3.5 w-3.5" />
                    Work Category
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    {selectedInvitation.projectWorkCategory || '—'}
                  </p>
                </div>

                {/* Start Date */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    Start Date
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    {selectedInvitation.projectStartDate 
                      ? format(new Date(selectedInvitation.projectStartDate), 'MMM d, yyyy')
                      : '—'}
                  </p>
                </div>

                {/* End Date */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    End Date
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    {selectedInvitation.projectEndDate 
                      ? format(new Date(selectedInvitation.projectEndDate), 'MMM d, yyyy')
                      : '—'}
                  </p>
                </div>

                {/* Duration */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    Duration
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    {getProjectDuration(selectedInvitation.projectStartDate, selectedInvitation.projectEndDate) || '—'}
                  </p>
                </div>
              </div>

              <Separator />

              {/* Invited Date */}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Invited on {format(new Date(selectedInvitation.invitedAt), 'MMMM d, yyyy')}</span>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              onClick={() => selectedInvitation && handleRespond(selectedInvitation.id, false)}
              disabled={respondingId === selectedInvitation?.id}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              <X className="h-4 w-4 mr-2" />
              Decline
            </Button>
            <Button
              variant="active"
              onClick={() => selectedInvitation && handleRespond(selectedInvitation.id, true)}
              disabled={respondingId === selectedInvitation?.id}
            >
              <Check className="h-4 w-4 mr-2" />
              Accept Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
