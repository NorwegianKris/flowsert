import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ProjectCalendar } from '@/components/ProjectCalendar';
import { CompanyCard } from '@/components/CompanyCard';
import { Project, ProjectCalendarItem } from '@/hooks/useProjects';
import { Personnel } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  Clock,
  CheckCircle,
  Users,
  FileText,
  Calendar,
  MapPin,
  Building2,
  ChevronRight,
} from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';

interface WorkerProjectDetailProps {
  project: Project;
  personnel: Personnel[];
  onBack: () => void;
}

const statusConfig = {
  active: { label: 'Active', variant: 'default' as const, icon: Clock, color: 'bg-primary' },
  completed: { label: 'Completed', variant: 'secondary' as const, icon: CheckCircle, color: 'bg-muted-foreground' },
  pending: { label: 'Pending', variant: 'outline' as const, icon: Clock, color: 'bg-amber-500' },
};

export function WorkerProjectDetail({ project, personnel, onBack }: WorkerProjectDetailProps) {
  const [companyCardOpen, setCompanyCardOpen] = useState(false);
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

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        onClick={onBack}
        className="gap-2 text-muted-foreground hover:text-foreground w-fit"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Profile
      </Button>

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
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-violet-500/10">
              <Users className="h-5 w-5 text-violet-500" />
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

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Section */}
        <div className="lg:col-span-2 space-y-4">
          <ProjectCalendar 
            project={project} 
            editable={false}
          />

          {/* Calendar Items List */}
          {project.calendarItems && project.calendarItems.length > 0 && (
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-sky-500" />
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
                        className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
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
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="space-y-4">
          {/* Company Card Section */}
          <Card 
            className="border-border/50 cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => setCompanyCardOpen(true)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Company Info</p>
                    <p className="text-sm text-muted-foreground">View company details & documents</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          {/* Team Members Card */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Users className="h-5 w-5 text-violet-500" />
                Team Members
              </CardTitle>
            </CardHeader>
            <CardContent>
              {assignedPersonnel.length > 0 ? (
                <div className="space-y-3">
                  {assignedPersonnel.map((person) => (
                    <div
                      key={person.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
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
                        <MapPin className="h-3 w-3 text-rose-500" />
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
            </CardContent>
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

      {/* Company Card Dialog */}
      <Dialog open={companyCardOpen} onOpenChange={setCompanyCardOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Company Information
            </DialogTitle>
          </DialogHeader>
          <CompanyCard isAdmin={false} onClose={() => setCompanyCardOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
