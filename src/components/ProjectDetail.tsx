import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ProjectCalendar } from '@/components/ProjectCalendar';
import { AddCalendarItemDialog } from '@/components/AddCalendarItemDialog';
import { ShareProjectDialog } from '@/components/ShareProjectDialog';
import { EditProjectDialog } from '@/components/EditProjectDialog';
import { Project, ProjectCalendarItem } from '@/hooks/useProjects';
import { Personnel } from '@/types';
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
}

const statusConfig = {
  active: { label: 'Active', variant: 'default' as const, icon: Clock, color: 'bg-primary' },
  completed: { label: 'Completed', variant: 'secondary' as const, icon: CheckCircle, color: 'bg-muted-foreground' },
  pending: { label: 'Pending', variant: 'outline' as const, icon: Clock, color: 'bg-amber-500' },
};

export function ProjectDetail({ project, personnel, onBack, onUpdateProject }: ProjectDetailProps) {
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isCloseDialogOpen, setIsCloseDialogOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

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
          <Button variant="outline" size="sm" onClick={() => setIsEditOpen(true)} className="gap-2">
            <Pencil className="h-4 w-4" />
            Edit Project
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIsAddItemOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Calendar Item
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
      <Card className="border-border/50">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-start gap-6">
            <div className={`p-4 rounded-xl ${config.color}/10`}>
              <StatusIcon className={`h-12 w-12 ${config.color === 'bg-primary' ? 'text-primary' : config.color === 'bg-muted-foreground' ? 'text-muted-foreground' : 'text-amber-500'}`} />
            </div>

            <div className="flex-1 space-y-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold text-foreground">
                    {project.name}
                  </h1>
                  <Badge variant={config.variant} className="text-sm">
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {config.label}
                  </Badge>
                </div>
                <p className="text-muted-foreground">{project.description}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span>Start: {format(projectStart, 'MMM d, yyyy')}</span>
                </div>
                {projectEnd && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span>End: {format(projectEnd, 'MMM d, yyyy')}</span>
                  </div>
                )}
                {duration && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4 text-primary" />
                    <span>{duration} days</span>
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
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {assignedPersonnel.length}
              </p>
              <p className="text-xs text-muted-foreground">Assigned Personnel</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Calendar className="h-5 w-5 text-primary" />
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
            <div className="p-2 rounded-lg bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
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

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Section */}
        <div className="lg:col-span-2 space-y-4">
          <ProjectCalendar 
            project={project} 
            onUpdateDates={handleUpdateDates}
            editable={!!onUpdateProject}
          />

          {/* Calendar Items List */}
          {project.calendarItems && project.calendarItems.length > 0 && (
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Calendar Items ({project.calendarItems.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {project.calendarItems
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                    .map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <div className="w-3 h-3 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">
                            {format(parseISO(item.date), 'MMM d, yyyy')}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {item.description}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveCalendarItem(item.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Assigned Personnel Section */}
        <div>
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Assigned Personnel
              </CardTitle>
            </CardHeader>
            <CardContent>
              {assignedPersonnel.length > 0 ? (
                <div className="space-y-3">
                  {assignedPersonnel.map((person) => (
                    <div
                      key={person.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
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
                  <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">
                    No personnel assigned to this project
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Project Information Section */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Project Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Project Name</p>
                <p className="text-foreground">{project.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Description</p>
                <p className="text-foreground">{project.description}</p>
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
          </div>
        </CardContent>
      </Card>

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

      <ShareProjectDialog
        open={isShareOpen}
        onOpenChange={setIsShareOpen}
        project={project}
        personnel={personnel}
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
    </div>
  );
}
