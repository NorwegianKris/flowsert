import { useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
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
  Layers,
  Repeat,
} from 'lucide-react';
import { format, parseISO, differenceInDays, isWithinInterval } from 'date-fns';
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
  allProjects?: Project[];
  onBack: () => void;
  onUpdateProject?: (project: Project) => void;
  onPersonnelClick?: (person: Personnel) => void;
  businessName?: string;
  onSelectProject?: (project: Project) => void;
}

const statusConfig = {
  active: { label: 'Active', variant: 'active' as const, icon: Clock, color: 'bg-active' },
  completed: { label: 'Completed', variant: 'completed' as const, icon: CheckCircle, color: 'bg-muted-foreground' },
  pending: { label: 'Pending', variant: 'outline' as const, icon: Clock, color: 'bg-amber-500' },
};

export function ProjectDetail({ project, personnel, allProjects, onBack, onUpdateProject, onPersonnelClick, businessName, onSelectProject }: ProjectDetailProps) {
  const { businessId } = useAuth();
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

  // Load sibling shifts for grouped projects
  const siblings = useMemo(() => {
    if (!project.shiftGroupId || !allProjects) return [];
    return allProjects
      .filter(p => p.shiftGroupId === project.shiftGroupId)
      .sort((a, b) => (a.shiftNumber || 0) - (b.shiftNumber || 0));
  }, [project.shiftGroupId, allProjects]);

  // Default selected shift to currently active shift or shift 1
  const defaultShiftId = useMemo(() => {
    if (siblings.length <= 1) return project.id;
    const today = new Date();
    const activeSibling = siblings.find(s => {
      if (!s.endDate) return false;
      try {
        return isWithinInterval(today, { start: parseISO(s.startDate), end: parseISO(s.endDate) });
      } catch { return false; }
    });
    return activeSibling?.id || siblings[0]?.id || project.id;
  }, [siblings, project.id]);

  const [selectedShiftId, setSelectedShiftId] = useState<string>(defaultShiftId);

  // Get the selected shift project for personnel filtering
  const selectedShiftProject = useMemo(() => {
    if (siblings.length <= 1) return project;
    return siblings.find(s => s.id === selectedShiftId) || project;
  }, [siblings, selectedShiftId, project]);

  const selectedConfig = statusConfig[selectedShiftProject.status as keyof typeof statusConfig] || statusConfig.active;
  const SelectedStatusIcon = selectedConfig.icon;
  
  const assignedPersonnel = selectedShiftProject.assignedPersonnel
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

  const projectStart = parseISO(selectedShiftProject.startDate);
  const projectEnd = selectedShiftProject.endDate ? parseISO(selectedShiftProject.endDate) : null;
  const duration = projectEnd ? differenceInDays(projectEnd, projectStart) + 1 : null;

  // Grouped project computed values
  const isGrouped = siblings.length > 1;
  const groupDisplayName = project.name.replace(/\s*—\s*Shift\s*\d+$/i, '');
  const groupStart = isGrouped ? parseISO(siblings[0].startDate) : projectStart;
  const groupEnd = isGrouped && siblings[siblings.length - 1].endDate
    ? parseISO(siblings[siblings.length - 1].endDate!) : projectEnd;
  const groupStatus = siblings.some(s => s.status === 'active') ? 'active' : project.status;
  const groupStatusConfig = statusConfig[groupStatus as keyof typeof statusConfig] || statusConfig.active;
  const GroupStatusIcon = groupStatusConfig.icon;
  const today = new Date();
  const currentShiftIdx = siblings.findIndex(s => s.id === selectedShiftId);
  const nextSibling = currentShiftIdx >= 0 && currentShiftIdx < siblings.length - 1 ? siblings[currentShiftIdx + 1] : null;
  const daysUntilNextShift = nextSibling ? differenceInDays(parseISO(nextSibling.startDate), today) : null;

  // Compliance: count valid certs across assigned personnel for this shift
  const complianceStats = useMemo(() => {
    let valid = 0;
    let total = 0;
    assignedPersonnel.forEach(p => {
      p.certificates.forEach(c => {
        total++;
        if (!c.expiryDate || differenceInDays(parseISO(c.expiryDate), today) >= 0) valid++;
      });
    });
    return { valid, total };
  }, [assignedPersonnel]);

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

      {isGrouped ? (
        <>
          {/* 3-Zone Cohesive Header for Grouped Projects */}
          <div className="overflow-hidden rounded-lg border border-teal-500/50">
            {/* Zone 1 — Group Header */}
            <div className="bg-teal-500/10 p-6">
              <div className="flex flex-col md:flex-row md:items-start gap-6">
                {project.imageUrl ? (
                  <img src={project.imageUrl} alt={groupDisplayName} className="h-20 w-20 rounded-xl object-cover border border-border" />
                ) : (
                  <div className="h-20 w-20 rounded-xl border border-border bg-muted flex items-center justify-center text-4xl">📋</div>
                )}
                <div className="flex-1 space-y-3">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h1 className="text-2xl font-bold text-foreground">{groupDisplayName}</h1>
                      <Badge className="bg-teal-500/20 text-teal-700 dark:text-teal-300 border-teal-500/50">
                        <Repeat className="h-3 w-3 mr-1" />
                        Recurring
                      </Badge>
                      <Badge variant={groupStatusConfig.variant}>
                        <GroupStatusIcon className="h-3 w-3 mr-1" />
                        {groupStatusConfig.label}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {[
                        project.location,
                        groupStart && groupEnd
                          ? `${format(groupStart, 'MMM d')} – ${format(groupEnd, 'MMM d, yyyy')}`
                          : groupStart ? `From ${format(groupStart, 'MMM d, yyyy')}` : null,
                        project.rotationOnDays && project.rotationOffDays
                          ? `${project.rotationOnDays} on / ${project.rotationOffDays} off`
                          : null,
                      ].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Zone 2 — Shift Selector */}
            <div className="bg-primary px-4 py-2 flex items-center gap-1.5 flex-wrap">
              <span className="text-primary-foreground/60 text-sm mr-2">Shift:</span>
              {siblings.map(s => {
                const sStart = parseISO(s.startDate);
                const sEnd = s.endDate ? parseISO(s.endDate) : null;
                const isNow = sEnd ? (() => { try { return isWithinInterval(today, { start: sStart, end: sEnd }); } catch { return false; } })() : false;
                const dateLabel = format(sStart, 'MMM d');
                const isSelected = s.id === selectedShiftId;
                return (
                  <button
                    key={s.id}
                    onClick={() => setSelectedShiftId(s.id)}
                    className={`inline-flex items-center whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
                      isSelected ? 'bg-primary-foreground text-primary shadow-sm' : 'text-primary-foreground/70 hover:bg-primary-foreground/15 hover:text-primary-foreground'
                    }`}
                  >
                    Shift {s.shiftNumber} · {dateLabel}{isNow ? ' — Now' : ''}
                  </button>
                );
              })}
            </div>

            {/* Zone 3 — Shift Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border">
              <div className="bg-card p-4 flex flex-col items-center justify-center">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="h-4 w-4 text-violet-500" />
                  <span className="text-2xl font-bold text-foreground">{assignedPersonnel.length}</span>
                </div>
                <p className="text-xs text-muted-foreground">Personnel this shift</p>
                <p className="text-xs text-muted-foreground/70 mt-0.5">
                  {format(projectStart, 'MMM d')} – {projectEnd ? format(projectEnd, 'MMM d') : '—'}
                </p>
              </div>
              <div className="bg-card p-4 flex flex-col items-center justify-center">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="h-4 w-4 text-sky-500" />
                  <span className="text-2xl font-bold text-foreground">{duration || '—'}</span>
                </div>
                <p className="text-xs text-muted-foreground">Shift duration (days)</p>
              </div>
              <div className="bg-card p-4 flex flex-col items-center justify-center">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  <span className="text-2xl font-bold text-foreground">{complianceStats.valid}/{complianceStats.total}</span>
                </div>
                <p className="text-xs text-muted-foreground">Certs valid</p>
              </div>
              <div className="bg-card p-4 flex flex-col items-center justify-center">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="h-4 w-4 text-amber-500" />
                  <span className="text-2xl font-bold text-foreground">
                    {daysUntilNextShift !== null
                      ? (daysUntilNextShift < 0 ? `${Math.abs(daysUntilNextShift)}d ago` : `In ${daysUntilNextShift}d`)
                      : '—'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {daysUntilNextShift !== null
                    ? (daysUntilNextShift < 0 ? 'Next shift started' : 'Next shift starts')
                    : 'Last shift'}
                </p>
              </div>
            </div>
          </div>

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
        </>
      ) : (
        <>
          {/* Non-grouped: Original Header Card */}
          <Card className={`border-border/50 ${project.isPosted ? 'border-[#C4B5FD]/50 bg-[#C4B5FD]/10' : ''} ${project.isRecurring ? 'bg-teal-500/10 border-teal-500/50' : ''}`}>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-start gap-6">
                {project.imageUrl ? (
                  <img src={project.imageUrl} alt={project.name} className="h-20 w-20 rounded-xl object-cover border border-border" />
                ) : (
                  <div className="h-20 w-20 rounded-xl border border-border bg-muted flex items-center justify-center text-4xl">📋</div>
                )}
                <div className="flex-1 space-y-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h1 className="text-2xl font-bold text-foreground">{project.name}</h1>
                      {project.isPosted ? (
                        <Badge className="bg-[#C4B5FD] text-[#4338CA] border-[#C4B5FD]">
                          <Megaphone className="h-3 w-3 mr-1" />
                          Posted
                        </Badge>
                      ) : (
                        <Badge variant={selectedConfig.variant}>
                          <SelectedStatusIcon className="h-3 w-3 mr-1" />
                          {selectedConfig.label}
                        </Badge>
                      )}
                      {project.isRecurring && project.rotationOnDays && (
                        <>
                          <Badge className="bg-teal-500/20 text-teal-700 dark:text-teal-300 border-teal-500/50">
                            <Repeat className="h-3 w-3 mr-1" />
                            {project.rotationOnDays} days on
                          </Badge>
                          <Badge className="bg-teal-500/20 text-teal-700 dark:text-teal-300 border-teal-500/50">
                            <Repeat className="h-3 w-3 mr-1" />
                            {project.rotationOffDays} days off
                          </Badge>
                        </>
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

          {/* Non-grouped: Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-border/50">
              <CardContent className="p-4 flex items-center gap-6">
                <div className="p-2 rounded-lg bg-violet-500/10">
                  <Users className="h-5 w-5 text-violet-500" />
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">{assignedPersonnel.length}</p>
                  <p className="text-xs text-muted-foreground">Personnel</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">{assignedPersonnel.filter(p => p.category !== 'freelancer').length}</p>
                  <p className="text-xs text-muted-foreground">Employees</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">{assignedPersonnel.filter(p => p.category === 'freelancer').length}</p>
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
                  <p className="text-2xl font-bold text-foreground">{duration || '—'}</p>
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
                  <p className="text-2xl font-bold text-foreground capitalize">{selectedConfig.label}</p>
                  <p className="text-xs text-muted-foreground">Project Status</p>
                </div>
              </CardContent>
            </Card>
          </div>

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
        </>
      )}

      {/* Timeline */}
      <ProjectTimeline
        project={selectedShiftProject}
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
          <ProjectChat projectId={selectedShiftProject.id} projectName={selectedShiftProject.name} />
        </div>

        {/* Right Side Tabs - Personnel & Calendar Items */}
        <div className="lg:col-span-1 h-[400px]">
          <Card className="border-border/50 h-full flex flex-col">
            <Tabs defaultValue="personnel" className="h-full flex flex-col min-h-0">
              <CardHeader className="pb-0 flex-shrink-0">
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
              <CardContent className="flex-1 min-h-0 overflow-hidden pt-4">
                {/* Assigned Personnel Tab */}
                <TabsContent value="personnel" className="mt-0 h-full overflow-y-auto">
                  {assignedPersonnel.length > 0 ? (
                    <div className="space-y-3">
                      {assignedPersonnel.map((person) => (
                        <div
                          key={person.id}
                          className={`flex items-center gap-3 p-3 rounded-lg border hover:shadow-lg hover:-translate-y-0.5 hover:ring-2 hover:ring-[#C4B5FD] hover:shadow-[#C4B5FD]/20 transition-all duration-200 ${person.category === 'freelancer' ? 'bg-[#C4B5FD]/10 border-[#C4B5FD]' : 'bg-card border-border/50'} ${onPersonnelClick ? 'cursor-pointer' : ''}`}
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
                            <div className="flex items-center gap-2">
                              <p className="text-sm text-muted-foreground truncate">
                                {person.role}
                              </p>
                              <Badge variant={person.category === 'freelancer' ? 'secondary' : 'default'} className="font-normal">
                                {person.category === 'freelancer' ? 'Freelancer' : 'Employee'}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex flex-col items-end text-xs text-muted-foreground shrink-0">
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 shrink-0" />
                              <span className="truncate max-w-[80px]">{(person.city || '').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || person.location?.split(',')[0]?.trim() || '—'}</span>
                            </div>
                            <span className="truncate max-w-[80px] text-muted-foreground/70">{(person.country || '').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || person.location?.split(',')[1]?.trim() || ''}</span>
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
                <TabsContent value="documents" className="mt-0 h-full overflow-y-auto">
                  <ProjectDocuments projectId={selectedShiftProject.id} businessId={businessId || undefined} />
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
                <Badge variant={selectedConfig.variant}>
                  <SelectedStatusIcon className="h-3 w-3 mr-1" />
                  {selectedConfig.label}
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
        phases={phases}
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
