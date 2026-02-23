import { useState, useCallback } from 'react';
import { useProjectApplications } from '@/hooks/useProjectApplications';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProjectTimeline } from '@/components/project-timeline/ProjectTimeline';

import { AddPhaseDialog } from '@/components/AddPhaseDialog';
import { AddCalendarItemDialog } from '@/components/AddCalendarItemDialog';
import { ShareProjectDialog } from '@/components/ShareProjectDialog';
import { EditTimelineItemsDialog } from '@/components/EditTimelineItemsDialog';
import { EditProjectDialog } from '@/components/EditProjectDialog';
import { ProjectCertificateStatus } from '@/components/ProjectCertificateStatus';
import { ProjectDocuments } from '@/components/ProjectDocuments';
import { ProjectChat } from '@/components/ProjectChat';
import { ProjectApplicationsList } from '@/components/ProjectApplicationsList';
import { Project, ProjectCalendarItem } from '@/hooks/useProjects';
import { Personnel } from '@/types';
import { useProjectPhases } from '@/hooks/useProjectPhases';
import {
  ArrowLeft,
  Clock,
  CheckCircle,
  Users,
  FileText,
  Calendar,
  MapPin,
  Plus,
  Share2,
  XCircle,
  Pencil,
  Inbox,
  Megaphone,
} from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
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
import { toast } from 'sonner';

interface ProjectDetailProps {
  project: Project;
  personnel: Personnel[];
  onBack: () => void;
  onUpdateProject?: (project: Project) => void;
  onPersonnelClick?: (person: Personnel) => void;
  businessName?: string;
}

const statusConfig = {
  active: { label: 'Active', variant: 'active' as const, icon: Clock, color: 'bg-active' },
  completed: { label: 'Completed', variant: 'completed' as const, icon: CheckCircle, color: 'bg-muted-foreground' },
  pending: { label: 'Pending', variant: 'outline' as const, icon: Clock, color: 'bg-amber-500' },
};

export function ProjectDetail({ project, personnel, onBack, onUpdateProject, onPersonnelClick, businessName }: ProjectDetailProps) {
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [isAddPhaseOpen, setIsAddPhaseOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isCloseDialogOpen, setIsCloseDialogOpen] = useState(false);
  const [isActivateDialogOpen, setIsActivateDialogOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isEditTimelineOpen, setIsEditTimelineOpen] = useState(false);
  const [highlightedCertificateId, setHighlightedCertificateId] = useState<string | null>(null);

  const { phases, addPhase, removePhase, updatePhase } = useProjectPhases(project.id);
  const { applications } = useProjectApplications(project.isPosted ? project.id : undefined);

  const config = statusConfig[project.status];
  const StatusIcon = config.icon;
  
  const assignedPersonnel = project.assignedPersonnel
    .map((id) => personnel.find((p) => p.id === id))
    .filter((p): p is Personnel => p !== undefined);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const projectStart = parseISO(project.startDate);
  const projectEnd = project.endDate ? parseISO(project.endDate) : null;
  const duration = projectEnd ? differenceInDays(projectEnd, projectStart) + 1 : null;

  const handleUpdateDates = (startDate: string, endDate: string | undefined) => {
    if (onUpdateProject) {
      onUpdateProject({
        ...project,
        startDate,
        endDate,
      });
    }
  };

  const handleAddCalendarItem = (item: ProjectCalendarItem) => {
    if (onUpdateProject) {
      const updatedItems = [...(project.calendarItems || []), item];
      onUpdateProject({
        ...project,
        calendarItems: updatedItems,
      });
      toast.success('Calendar item added');
    }
  };

  const handleRemoveCalendarItem = (itemId: string) => {
    if (onUpdateProject) {
      const updatedItems = (project.calendarItems || []).filter((i) => i.id !== itemId);
      onUpdateProject({
        ...project,
        calendarItems: updatedItems,
      });
      toast.success('Calendar item removed');
    }
  };

  const handleUpdateCalendarItem = (itemId: string, updates: { description?: string; date?: string }) => {
    if (onUpdateProject) {
      const updatedItems = (project.calendarItems || []).map((i) =>
        i.id === itemId ? { ...i, ...updates } : i
      );
      onUpdateProject({
        ...project,
        calendarItems: updatedItems,
      });
      toast.success('Calendar item updated');
    }
  };

  const handleCloseProject = () => {
    if (onUpdateProject) {
      onUpdateProject({
        ...project,
        status: 'completed',
      });
      toast.success('Project status changed to Completed');
    }
    setIsCloseDialogOpen(false);
  };

  const handleActivateProject = () => {
    if (onUpdateProject) {
      onUpdateProject({
        ...project,
        isPosted: false,
      });
      toast.success('Project activated — no longer posted');
    }
    setIsActivateDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Button
          variant="ghost"
          onClick={onBack}
          className="gap-2 text-muted-foreground hover:text-foreground w-fit"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Projects
        </Button>

        <div className="flex flex-wrap gap-2">
          {project.isPosted && (
            <Button size="sm" onClick={() => setIsActivateDialogOpen(true)} className="gap-2">
              <CheckCircle className="h-4 w-4" />
              Activate Project
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setIsEditOpen(true)} className="gap-2">
            <Pencil className="h-4 w-4" />
            Edit Project
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIsShareOpen(true)} className="gap-2">
            <Share2 className="h-4 w-4" />
            Share Project
          </Button>
          {project.status === 'active' && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsCloseDialogOpen(true)} 
              className="gap-2 text-destructive hover:text-destructive"
            >
              <XCircle className="h-4 w-4" />
              Close Project
            </Button>
          )}
        </div>
      </div>

      {/* Project Header Card */}
      <Card className={`border-border/50 ${project.isPosted ? 'border-[#C4B5FD]/50 bg-[#C4B5FD]/10' : ''}`}>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-start gap-6">
            {project.imageUrl ? (
              <img
                src={project.imageUrl}
                alt={project.name}
                className="h-20 w-20 rounded-xl object-cover border border-border"
              />
            ) : (
              <div className={`p-4 rounded-xl ${project.isPosted ? 'bg-[#C4B5FD]/10' : `${config.color}/10`}`}>
                {project.isPosted ? (
                  <Megaphone className="h-12 w-12 text-[#C4B5FD]" />
                ) : (
                  <StatusIcon className={`h-12 w-12 ${config.color === 'bg-active' ? 'text-active' : config.color === 'bg-muted-foreground' ? 'text-muted-foreground' : 'text-amber-500'}`} />
                )}
              </div>
            )}

            <div className="flex-1 space-y-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold text-foreground">
                    {project.name}
                  </h1>
                  {project.isPosted ? (
                    <Badge className="text-sm bg-[#C4B5FD] text-[#4338CA] border-[#C4B5FD]">
                      <Megaphone className="h-3 w-3 mr-1" />
                      Posted
                    </Badge>
                  ) : (
                    <Badge variant={config.variant} className="text-sm">
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {config.label}
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground">{project.description}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4 text-sky-500" />
                  <span>Start: {format(projectStart, 'MMM d, yyyy')}</span>
                </div>
                {projectEnd && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4 text-sky-500" />
                    <span>End: {format(projectEnd, 'MMM d, yyyy')}</span>
                  </div>
                )}
                {duration && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4 text-amber-500" />
                    <span>{duration} days</span>
                  </div>
                )}
                {project.isPosted && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="h-4 w-4 text-primary" />
                    <span>{applications.filter(a => a.status !== 'rejected').length} Applicant{applications.filter(a => a.status !== 'rejected').length !== 1 ? 's' : ''}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-6">
            <div className="p-2 rounded-lg bg-violet-500/10">
              <Users className="h-5 w-5 text-violet-500" />
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">
                {assignedPersonnel.length}
              </p>
              <p className="text-xs text-muted-foreground">Personnel</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">
                {assignedPersonnel.filter(p => p.category !== 'freelancer').length}
              </p>
              <p className="text-xs text-muted-foreground">Employees</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">
                {assignedPersonnel.filter(p => p.category === 'freelancer').length}
              </p>
              <p className="text-xs text-muted-foreground">Freelancers</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-sky-500/10">
              <Calendar className="h-5 w-5 text-sky-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {duration || '—'}
              </p>
              <p className="text-xs text-muted-foreground">Total Days</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <FileText className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground capitalize">
                {project.status}
              </p>
              <p className="text-xs text-muted-foreground">Project Status</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Project Applications Card - shown for posted projects */}
      {project.isPosted && (
        <Card className="border-border/50 border-primary/30 bg-primary/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Inbox className="h-5 w-5 text-primary" />
                Project Applications
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ProjectApplicationsList projectId={project.id} />
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      <ProjectTimeline
        project={project}
        personnel={personnel}
        phases={phases}
        onPersonnelClick={onPersonnelClick}
        onEditProject={() => setIsEditOpen(true)}
        onAddItem={() => setIsAddItemOpen(true)}
        onAddPhase={() => setIsAddPhaseOpen(true)}
        onHighlightCertificate={setHighlightedCertificateId}
        onEditTimeline={() => setIsEditTimelineOpen(true)}
      />

      {/* Main Content - Tabs with Side Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chat Section */}
        <div className="lg:col-span-2 space-y-6">
          {/* Project Chat */}
          <ProjectChat projectId={project.id} projectName={project.name} />
        </div>

        {/* Right Side Tabs - Personnel & Calendar Items */}
        <div className="lg:col-span-1">
          <Card className="border-border/50 h-full">
            <Tabs defaultValue="personnel" className="h-full flex flex-col">
              <CardHeader className="pb-0">
              <TabsList className="w-full grid grid-cols-2">
                  <TabsTrigger value="personnel" className="gap-1.5 text-xs sm:text-sm">
                    <Users className="h-4 w-4" />
                    <span className="hidden sm:inline">Personnel</span>
                  </TabsTrigger>
                  <TabsTrigger value="documents" className="gap-1.5 text-xs sm:text-sm">
                    <FileText className="h-5 w-5" />
                    <span className="hidden sm:inline">Documents</span>
                  </TabsTrigger>
                </TabsList>
              </CardHeader>
              <CardContent className="flex-1 overflow-auto pt-4">
                {/* Assigned Personnel Tab */}
                <TabsContent value="personnel" className="mt-0 h-full">
                  {assignedPersonnel.length > 0 ? (
                    <div className="space-y-3">
                      {assignedPersonnel.map((person) => (
                        <div
                          key={person.id}
                          className={`flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors ${onPersonnelClick ? 'cursor-pointer' : ''}`}
                          onClick={() => onPersonnelClick?.(person)}
                        >
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={person.avatarUrl} alt={person.name} />
                            <AvatarFallback className="text-sm font-medium">
                              {getInitials(person.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground truncate">
                              {person.name}
                            </p>
                            <p className="text-sm text-muted-foreground truncate">
                              {person.role}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate max-w-[80px]">{person.location}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-3">👥</div>
                      <p className="text-muted-foreground text-sm">
                        No personnel assigned to this project
                      </p>
                    </div>
                  )}
                </TabsContent>

                {/* Documents Tab */}
                <TabsContent value="documents" className="mt-0 h-full">
                  <ProjectDocuments projectId={project.id} />
                </TabsContent>

              </CardContent>
            </Tabs>
          </Card>
        </div>
      </div>

      {/* Project Information Section */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5 text-teal-500" />
            Project Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Project Name</p>
                <p className="text-foreground">{project.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Project Number</p>
                <p className="text-foreground">{project.projectNumber || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Customer</p>
                <p className="text-foreground">{project.customer || 'Not specified'}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Work Category</p>
                <p className="text-foreground">{project.workCategory || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Location</p>
                <p className="text-foreground">{project.location || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Project Manager</p>
                <p className="text-foreground">{project.projectManager || 'Not specified'}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Start Date</p>
                <p className="text-foreground">{format(projectStart, 'MMMM d, yyyy')}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">End Date</p>
                <p className="text-foreground">
                  {projectEnd ? format(projectEnd, 'MMMM d, yyyy') : 'Not specified'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Status</p>
                <Badge variant={config.variant}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {config.label}
                </Badge>
              </div>
            </div>
            <div className="md:col-span-2 lg:col-span-3">
              <p className="text-sm font-medium text-muted-foreground mb-1">Description</p>
              <p className="text-foreground">{project.description}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Certificate Status Section */}
      <div data-certificate-status>
        <ProjectCertificateStatus personnel={assignedPersonnel} highlightedCertificateId={highlightedCertificateId} onClearHighlight={() => setHighlightedCertificateId(null)} />
      </div>

      {/* Dialogs */}
      <EditProjectDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        project={project}
        personnel={personnel}
        onSave={(updatedProject) => {
          if (onUpdateProject) {
            onUpdateProject(updatedProject);
          }
        }}
      />


      <AddCalendarItemDialog
        open={isAddItemOpen}
        onOpenChange={setIsAddItemOpen}
        onAdd={handleAddCalendarItem}
        projectStartDate={project.startDate}
        projectEndDate={project.endDate}
      />
      <AddPhaseDialog
        open={isAddPhaseOpen}
        onOpenChange={setIsAddPhaseOpen}
        onAdd={addPhase}
        projectStartDate={project.startDate}
        projectEndDate={project.endDate}
      />
      <ShareProjectDialog
        open={isShareOpen}
        onOpenChange={setIsShareOpen}
        project={project}
        personnel={personnel}
        businessName={businessName}
      />
      <EditTimelineItemsDialog
        open={isEditTimelineOpen}
        onOpenChange={setIsEditTimelineOpen}
        calendarItems={project.calendarItems || []}
        phases={phases}
        onRemoveCalendarItem={handleRemoveCalendarItem}
        onRemovePhase={removePhase}
        onUpdateCalendarItem={handleUpdateCalendarItem}
        onUpdatePhase={updatePhase}
      />

      <AlertDialog open={isCloseDialogOpen} onOpenChange={setIsCloseDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to close this project? This will change the status from "Active" to "Completed" and move it to Previous projects.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleCloseProject}>
              Close Project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isActivateDialogOpen} onOpenChange={setIsActivateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Activate Project</AlertDialogTitle>
            <AlertDialogDescription>
              This will convert the posted project into a regular active project. It will no longer be visible to workers as an open opportunity.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleActivateProject}>
              Activate Project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
