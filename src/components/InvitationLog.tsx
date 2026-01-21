import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useProjectInvitations, ProjectInvitation } from '@/hooks/useProjectInvitations';
import { Personnel } from '@/types';
import { Project } from '@/hooks/useProjects';
import { ClipboardList, Check, X, Clock, Filter, MoreHorizontal } from 'lucide-react';
import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface InvitationLogProps {
  projects: Project[];
  personnel: Personnel[];
}

const statusConfig = {
  pending: { 
    label: 'Pending', 
    icon: Clock, 
    bgColor: 'bg-yellow-500/20',
    textColor: 'text-yellow-600',
    borderColor: 'border-yellow-500/30'
  },
  accepted: { 
    label: 'Added to Project', 
    icon: Check, 
    bgColor: 'bg-green-500/20',
    textColor: 'text-green-600',
    borderColor: 'border-green-500/30'
  },
  declined: { 
    label: 'Declined', 
    icon: X, 
    bgColor: 'bg-red-500/20',
    textColor: 'text-red-600',
    borderColor: 'border-red-500/30'
  },
};

export function InvitationLog({ projects, personnel }: InvitationLogProps) {
  const { invitations, loading, updateInvitationStatus } = useProjectInvitations();
  const [filterProject, setFilterProject] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const getPersonnelById = (id: string) => personnel.find((p) => p.id === id);
  const getProjectById = (id: string) => projects.find((p) => p.id === id);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const filteredInvitations = invitations.filter((inv) => {
    if (filterProject !== 'all' && inv.projectId !== filterProject) return false;
    if (filterStatus !== 'all' && inv.status !== filterStatus) return false;
    return true;
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleStatusChange = async (invitationId: string, newStatus: 'pending' | 'accepted' | 'declined') => {
    setUpdatingId(invitationId);
    await updateInvitationStatus(invitationId, newStatus);
    setUpdatingId(null);
  };

  if (loading) {
    return (
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-purple-500" />
            Invitation Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-purple-500" />
            Invitation Log
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={filterProject} onValueChange={setFilterProject}>
              <SelectTrigger className="w-[180px] h-8 text-sm">
                <SelectValue placeholder="Filter by project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px] h-8 text-sm">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="declined">Declined</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredInvitations.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-3">📨</div>
            <p className="text-muted-foreground">No invitations found</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {filteredInvitations.map((invitation) => {
                const person = getPersonnelById(invitation.personnelId);
                const project = getProjectById(invitation.projectId);
                const config = statusConfig[invitation.status];
                const StatusIcon = config.icon;
                const isUpdating = updatingId === invitation.id;

                return (
                  <div
                    key={invitation.id}
                    className="flex items-center gap-4 p-3 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={person?.avatarUrl} alt={person?.name} />
                      <AvatarFallback className="text-xs">
                        {person ? getInitials(person.name) : '?'}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm truncate">
                          {invitation.personnelName || person?.name || 'Unknown'}
                        </p>
                        <span className="text-muted-foreground text-xs">→</span>
                        <p className="text-sm text-muted-foreground truncate">
                          {invitation.projectName || project?.name || 'Unknown Project'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span>Invited: {formatDate(invitation.invitedAt)}</span>
                        {invitation.respondedAt && (
                          <>
                            <span>•</span>
                            <span>Responded: {formatDate(invitation.respondedAt)}</span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <Badge 
                      variant="outline" 
                      className={`shrink-0 ${config.bgColor} ${config.textColor} ${config.borderColor}`}
                    >
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {config.label}
                    </Badge>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          disabled={isUpdating}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem 
                          onClick={() => handleStatusChange(invitation.id, 'accepted')}
                          disabled={invitation.status === 'accepted' || isUpdating}
                          className="text-green-600"
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Set as Added to Project
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleStatusChange(invitation.id, 'pending')}
                          disabled={invitation.status === 'pending' || isUpdating}
                          className="text-yellow-600"
                        >
                          <Clock className="h-4 w-4 mr-2" />
                          Set as Pending
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleStatusChange(invitation.id, 'declined')}
                          disabled={invitation.status === 'declined' || isUpdating}
                          className="text-red-600"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Set as Declined
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
