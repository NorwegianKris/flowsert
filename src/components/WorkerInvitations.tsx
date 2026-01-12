import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useProjectInvitations } from '@/hooks/useProjectInvitations';
import { Mail, Check, X, FolderOpen, Clock } from 'lucide-react';
import { useState } from 'react';

interface WorkerInvitationsProps {
  personnelId: string;
}

export function WorkerInvitations({ personnelId }: WorkerInvitationsProps) {
  const { invitations, respondToInvitation, loading } = useProjectInvitations();
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const pendingInvitations = invitations.filter(
    (inv) => inv.personnelId === personnelId && inv.status === 'pending'
  );

  const handleRespond = async (invitationId: string, accept: boolean) => {
    setRespondingId(invitationId);
    await respondToInvitation(invitationId, accept);
    setRespondingId(null);
  };

  if (loading) {
    return null;
  }

  if (pendingInvitations.length === 0) {
    return null;
  }

  return (
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
              className="flex items-center justify-between gap-4 p-3 rounded-lg bg-background border border-border/50"
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
                  variant="outline"
                  size="sm"
                  onClick={() => handleRespond(invitation.id, false)}
                  disabled={respondingId === invitation.id}
                  className="text-destructive hover:text-destructive"
                >
                  <X className="h-4 w-4 mr-1" />
                  Decline
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleRespond(invitation.id, true)}
                  disabled={respondingId === invitation.id}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Accept
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
