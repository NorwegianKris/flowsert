import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useAssignedProjects } from '@/components/AssignedProjects';
import { useProjectInvitations } from '@/hooks/useProjectInvitations';
import { Briefcase, Calendar, Loader2, ChevronRight, Mail, FolderOpen, Clock, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, differenceInDays } from 'date-fns';
import { Project } from '@/hooks/useProjects';
import { ProjectInvitation } from '@/hooks/useProjectInvitations';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { MapPin, FileText, Hash, Building, User } from 'lucide-react';

interface PersonnelProjectsTabsProps {
  personnelId: string;
  isFreelancer: boolean;
  hideInvitations: boolean;
  onProjectClick?: (project: Project) => void;
}

export function PersonnelProjectsTabs({ personnelId, isFreelancer, hideInvitations, onProjectClick }: PersonnelProjectsTabsProps) {
  const { projects, loading: projectsLoading } = useAssignedProjects(personnelId);
  const { invitations, updateInvitationStatus, loading: invitationsLoading } = useProjectInvitations();

  const activeProjects = projects.filter((p) => p.status === 'active' || p.status === 'pending');
  const previousProjects = projects.filter((p) => p.status === 'completed');
  const pendingInvitations = invitations.filter(
    (inv) => inv.personnelId === personnelId && inv.status === 'pending'
  );

  const showProjectTabs = !isFreelancer;
  const showInvitationsTab = !hideInvitations;

  // If nothing to show, render nothing
  if (!showProjectTabs && !showInvitationsTab) return null;

  // Determine default tab
  const defaultTab = showProjectTabs ? 'active' : 'invitations';

  const loading = projectsLoading || invitationsLoading;

  if (loading) {
    return (
      <Card className="border-border/50">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <Tabs defaultValue={defaultTab}>
        <CardHeader className="py-3">
          <TabsList>
            {showProjectTabs && (
              <>
                <TabsTrigger value="active" className="gap-1.5">
                  Active Projects
                  {activeProjects.length > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] px-1.5 text-xs">
                      {activeProjects.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="previous" className="gap-1.5">
                  Previous
                  {previousProjects.length > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] px-1.5 text-xs">
                      {previousProjects.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </>
            )}
            {showInvitationsTab && (
              <TabsTrigger value="invitations" className="gap-1.5">
                Invitations
                {pendingInvitations.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] px-1.5 text-xs">
                    {pendingInvitations.length}
                  </Badge>
                )}
              </TabsTrigger>
            )}
          </TabsList>
        </CardHeader>
        <CardContent className="pt-0">
          {showProjectTabs && (
            <>
              <TabsContent value="active">
                <ProjectList projects={activeProjects} onProjectClick={onProjectClick} emptyMessage="No active projects" variant="active" />
              </TabsContent>
              <TabsContent value="previous">
                <ProjectList projects={previousProjects} onProjectClick={onProjectClick} emptyMessage="No previous projects" variant="previous" />
              </TabsContent>
            </>
          )}
          {showInvitationsTab && (
            <TabsContent value="invitations">
              <InvitationsContent
                invitations={pendingInvitations}
                updateInvitationStatus={updateInvitationStatus}
              />
            </TabsContent>
          )}
        </CardContent>
      </Tabs>
    </Card>
  );
}

// --- Sub-components ---

function ProjectList({ projects, onProjectClick, emptyMessage, variant }: {
  projects: Project[];
  onProjectClick?: (project: Project) => void;
  emptyMessage: string;
  variant: 'active' | 'previous';
}) {
  const formatDateRange = (startDate: string, endDate?: string) => {
    const start = format(new Date(startDate), 'MMM d, yyyy');
    if (endDate) {
      return `${start} - ${format(new Date(endDate), 'MMM d, yyyy')}`;
    }
    return `${start} - Present`;
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'active': return 'active' as const;
      case 'pending': return 'secondary' as const;
      case 'completed': return 'completed' as const;
      default: return 'secondary' as const;
    }
  };

  if (projects.length === 0) {
    return (
      <div className="text-center py-6">
        <div className="text-3xl mb-2">📋</div>
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {projects.map((project) => (
        <div
          key={project.id}
          onClick={() => onProjectClick?.(project)}
          className={`p-3 rounded-lg border border-border/50 cursor-pointer group transition-colors ${
            variant === 'previous' ? 'bg-muted/30 hover:bg-muted/50' : 'bg-card hover:bg-accent/50'
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                {project.name}
              </p>
              <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3 text-sky-500" />
                <span>{formatDateRange(project.startDate, project.endDate)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={getStatusVariant(project.status)} className="text-xs capitalize shrink-0">
                {project.status}
              </Badge>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function InvitationsContent({ invitations, updateInvitationStatus }: {
  invitations: ProjectInvitation[];
  updateInvitationStatus: (id: string, status: string) => Promise<void>;
}) {
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [selectedInvitation, setSelectedInvitation] = useState<ProjectInvitation | null>(null);

  const handleStatusChange = async (invitationId: string, accept: boolean, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setRespondingId(invitationId);
    await updateInvitationStatus(invitationId, accept ? 'accepted' : 'declined');
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
      case 'active': return 'active' as const;
      case 'completed': return 'completed' as const;
      case 'pending': return 'outline' as const;
      default: return 'secondary' as const;
    }
  };

  if (invitations.length === 0) {
    return (
      <div className="text-center py-6">
        <div className="text-3xl mb-2">✉️</div>
        <p className="text-sm text-muted-foreground">No pending invitations</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {invitations.map((invitation) => (
          <div
            key={invitation.id}
            onClick={() => setSelectedInvitation(invitation)}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-background border border-border/50 cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
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
                  <span>Invited {new Date(invitation.invitedAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button variant="outline" size="sm" onClick={(e) => handleStatusChange(invitation.id, false, e)} disabled={respondingId === invitation.id} className="text-red-600 hover:bg-red-50 hover:text-red-700 flex-1 sm:flex-initial">
                <X className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Decline</span>
              </Button>
              <Button size="sm" onClick={(e) => handleStatusChange(invitation.id, true, e)} disabled={respondingId === invitation.id} className="bg-emerald-600 text-white hover:bg-emerald-700 flex-1 sm:flex-initial">
                <Check className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Accept</span>
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Invitation Detail Dialog */}
      <Dialog open={!!selectedInvitation} onOpenChange={(open) => !open && setSelectedInvitation(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-primary" />
              {selectedInvitation?.projectName || 'Project'} - Invitation
            </DialogTitle>
            <DialogDescription>Invitation details for this project</DialogDescription>
          </DialogHeader>
          {selectedInvitation && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                {selectedInvitation.projectNumber ? (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Hash className="h-3 w-3" />Project #{selectedInvitation.projectNumber}
                  </p>
                ) : <div />}
                {selectedInvitation.projectStatus && (
                  <Badge variant={getStatusBadgeVariant(selectedInvitation.projectStatus)}>
                    {selectedInvitation.projectStatus.charAt(0).toUpperCase() + selectedInvitation.projectStatus.slice(1)}
                  </Badge>
                )}
              </div>
              <div className="space-y-1.5 p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <FileText className="h-4 w-4 text-primary" />Description
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {selectedInvitation.projectDescription || 'No description provided'}
                </p>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground"><Building className="h-3.5 w-3.5" />Customer</div>
                  <p className="text-sm font-medium text-foreground">{selectedInvitation.projectCustomer || '—'}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground"><User className="h-3.5 w-3.5" />Project Manager</div>
                  <p className="text-sm font-medium text-foreground">{selectedInvitation.projectManager || '—'}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground"><MapPin className="h-3.5 w-3.5" />Location</div>
                  <p className="text-sm font-medium text-foreground">{selectedInvitation.projectLocation || '—'}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground"><Briefcase className="h-3.5 w-3.5" />Work Category</div>
                  <p className="text-sm font-medium text-foreground">{selectedInvitation.projectWorkCategory || '—'}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground"><Calendar className="h-3.5 w-3.5" />Start Date</div>
                  <p className="text-sm font-medium text-foreground">{selectedInvitation.projectStartDate ? format(new Date(selectedInvitation.projectStartDate), 'MMM d, yyyy') : '—'}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground"><Calendar className="h-3.5 w-3.5" />End Date</div>
                  <p className="text-sm font-medium text-foreground">{selectedInvitation.projectEndDate ? format(new Date(selectedInvitation.projectEndDate), 'MMM d, yyyy') : '—'}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground"><Clock className="h-3.5 w-3.5" />Duration</div>
                  <p className="text-sm font-medium text-foreground">{getProjectDuration(selectedInvitation.projectStartDate, selectedInvitation.projectEndDate) || '—'}</p>
                </div>
              </div>
              <Separator />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Invited on {format(new Date(selectedInvitation.invitedAt), 'MMMM d, yyyy')}</span>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => selectedInvitation && handleStatusChange(selectedInvitation.id, false)} disabled={respondingId === selectedInvitation?.id} className="text-red-600 hover:text-red-700">
              <X className="h-4 w-4 mr-2" />Decline
            </Button>
            <Button onClick={() => selectedInvitation && handleStatusChange(selectedInvitation.id, true)} disabled={respondingId === selectedInvitation?.id} className="bg-emerald-600 text-white hover:bg-emerald-700">
              <Check className="h-4 w-4 mr-2" />Accept Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}