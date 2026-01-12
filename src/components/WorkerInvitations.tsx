import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useProjectInvitations, ProjectInvitation } from '@/hooks/useProjectInvitations';
import { Mail, Check, X, FolderOpen, Clock, MapPin, Calendar, FileText } from 'lucide-react';
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

  const handleRespond = async (invitationId: string, accept: boolean) => {
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

  if (pendingInvitations.length === 0) {
    return null;
  }

  return (
    <>
      <Card className="border-border/50 border-primary/30 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Project Invitations
            <Badge variant="secondary" className="ml-2">
              {pendingInvitations.length} pending
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
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
                
                <div className="text-xs text-muted-foreground shrink-0">
                  Click to view details
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Invitation Detail Dialog */}
      <Dialog open={!!selectedInvitation} onOpenChange={(open) => !open && setSelectedInvitation(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-primary" />
              Project Invitation
            </DialogTitle>
            <DialogDescription>
              You have been invited to join this project
            </DialogDescription>
          </DialogHeader>

          {selectedInvitation && (
            <div className="space-y-4">
              {/* Project Name and Status */}
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-foreground">
                  {selectedInvitation.projectName || 'Unnamed Project'}
                </h3>
                {selectedInvitation.projectStatus && (
                  <Badge variant={getStatusBadgeVariant(selectedInvitation.projectStatus)}>
                    {selectedInvitation.projectStatus.charAt(0).toUpperCase() + selectedInvitation.projectStatus.slice(1)}
                  </Badge>
                )}
              </div>

              {/* Project Description */}
              {selectedInvitation.projectDescription && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    <span className="font-medium">Description</span>
                  </div>
                  <p className="text-sm text-foreground pl-6">
                    {selectedInvitation.projectDescription}
                  </p>
                </div>
              )}

              {/* Project Details Grid */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                {/* Location */}
                {selectedInvitation.projectLocation && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span className="font-medium">Location</span>
                    </div>
                    <p className="text-sm text-foreground pl-6">
                      {selectedInvitation.projectLocation}
                    </p>
                  </div>
                )}

                {/* Duration */}
                {selectedInvitation.projectStartDate && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span className="font-medium">Duration</span>
                    </div>
                    <p className="text-sm text-foreground pl-6">
                      {getProjectDuration(selectedInvitation.projectStartDate, selectedInvitation.projectEndDate)}
                    </p>
                  </div>
                )}

                {/* Start Date */}
                {selectedInvitation.projectStartDate && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span className="font-medium">Start Date</span>
                    </div>
                    <p className="text-sm text-foreground pl-6">
                      {format(new Date(selectedInvitation.projectStartDate), 'MMM d, yyyy')}
                    </p>
                  </div>
                )}

                {/* End Date */}
                {selectedInvitation.projectEndDate && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span className="font-medium">End Date</span>
                    </div>
                    <p className="text-sm text-foreground pl-6">
                      {format(new Date(selectedInvitation.projectEndDate), 'MMM d, yyyy')}
                    </p>
                  </div>
                )}
              </div>

              {/* Invited Date */}
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  Invited on {format(new Date(selectedInvitation.invitedAt), 'MMMM d, yyyy')}
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => selectedInvitation && handleRespond(selectedInvitation.id, false)}
              disabled={respondingId === selectedInvitation?.id}
              className="text-destructive hover:text-destructive"
            >
              <X className="h-4 w-4 mr-2" />
              Decline
            </Button>
            <Button
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
