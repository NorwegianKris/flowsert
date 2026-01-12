import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useProjectInvitations, ProjectInvitation } from '@/hooks/useProjectInvitations';
import { Personnel } from '@/types';
import { Project } from '@/hooks/useProjects';
import { ClipboardList, Check, X, Clock, Filter } from 'lucide-react';
import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface InvitationLogProps {
  projects: Project[];
  personnel: Personnel[];
}

const statusConfig = {
  pending: { label: 'Pending', variant: 'outline' as const, icon: Clock, color: 'text-muted-foreground' },
  accepted: { label: 'Accepted', variant: 'default' as const, icon: Check, color: 'text-[hsl(var(--status-valid))]' },
  declined: { label: 'Declined', variant: 'destructive' as const, icon: X, color: 'text-destructive' },
};

export function InvitationLog({ projects, personnel }: InvitationLogProps) {
  const { invitations, loading } = useProjectInvitations();
  const [filterProject, setFilterProject] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

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

  if (loading) {
    return (
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
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
            <ClipboardList className="h-5 w-5 text-primary" />
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
          <p className="text-center text-muted-foreground py-8">
            No invitations found
          </p>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {filteredInvitations.map((invitation) => {
                const person = getPersonnelById(invitation.personnelId);
                const project = getProjectById(invitation.projectId);
                const config = statusConfig[invitation.status];
                const StatusIcon = config.icon;

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
                    
                    <Badge variant={config.variant} className="shrink-0">
                      <StatusIcon className={`h-3 w-3 mr-1 ${config.color}`} />
                      {config.label}
                    </Badge>
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
