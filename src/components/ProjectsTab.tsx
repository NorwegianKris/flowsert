import { useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { FolderOpen, Clock, CheckCircle, ChevronDown, Megaphone, Users, MapPin, Repeat, Search, Layers } from 'lucide-react';
import { Project } from '@/hooks/useProjects';
import { Personnel } from '@/types';
import { InvitationLog } from '@/components/InvitationLog';
import { Input } from '@/components/ui/input';

interface ProjectsTabProps {
  projects: Project[];
  personnel: Personnel[];
  onSelectProject: (project: Project) => void;
}

const statusConfig = {
  active: { label: 'Active', variant: 'active' as const, icon: Clock, badgeClass: 'bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/50' },
  completed: { label: 'Completed', variant: 'completed' as const, icon: CheckCircle, badgeClass: 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/50' },
  pending: { label: 'Pending', variant: 'outline' as const, icon: Clock, badgeClass: 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/50' },
};

type ProjectFilterValue = 'all' | 'active' | 'recurring' | 'posted';

export function ProjectsTab({ projects, personnel, onSelectProject }: ProjectsTabProps) {
  const [previousOpen, setPreviousOpen] = useState(false);
  const [projectFilter, setProjectFilter] = useState<ProjectFilterValue>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filter projects based on search
  const searchedProjects = projects.filter(p => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.description && p.description.toLowerCase().includes(q)) ||
      (p.location && p.location.toLowerCase().includes(q)) ||
      (p.projectLocationLabel && p.projectLocationLabel.toLowerCase().includes(q))
    );
  });
  
  // Filter by toggle group selection
  const filteredProjects = searchedProjects.filter(p => {
    if (projectFilter === 'active') return !p.isPosted && !p.isRecurring;
    if (projectFilter === 'recurring') return p.isRecurring;
    if (projectFilter === 'posted') return p.isPosted;
    return true; // 'all'
  });
  
  const activeProjects = filteredProjects.filter((p) => p.status === 'active' || p.status === 'pending');
  const completedProjects = filteredProjects.filter((p) => p.status === 'completed');

  // Group shift projects and build ordered list
  const { shiftGroups, standaloneProjects } = useMemo(() => {
    const groups = new Map<string, Project[]>();
    const standalone: Project[] = [];

    activeProjects.forEach(p => {
      if (p.shiftGroupId) {
        const existing = groups.get(p.shiftGroupId) || [];
        existing.push(p);
        groups.set(p.shiftGroupId, existing);
      } else {
        standalone.push(p);
      }
    });

    // Sort each group by shift number
    const shiftGroups: { groupId: string; projects: Project[]; color: string | undefined }[] = [];
    groups.forEach((prjs, groupId) => {
      prjs.sort((a, b) => (a.shiftNumber || 0) - (b.shiftNumber || 0));
      const color = prjs[0]?.groupColor;
      shiftGroups.push({ groupId, projects: prjs, color });
    });

    return { shiftGroups, standaloneProjects: standalone };
  }, [activeProjects]);

  const getPersonnelById = (id: string) => personnel.find((p) => p.id === id);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-6">
      {/* Search + Filter Row */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-full max-w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects by name, description or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 border-border"
          />
        </div>
        <ToggleGroup
          type="single"
          value={projectFilter}
          onValueChange={(value) => {
            if (value) setProjectFilter(value as ProjectFilterValue);
          }}
          className="bg-primary p-1 rounded-lg shrink-0"
        >
          <ToggleGroupItem
            value="all"
            aria-label="All projects"
            className="text-primary-foreground hover:bg-primary-foreground/20 data-[state=on]:bg-background data-[state=on]:text-primary data-[state=on]:shadow-sm px-3 py-1.5 text-sm"
          >
            <FolderOpen className="h-4 w-4 mr-1.5" />
            All
          </ToggleGroupItem>
          <ToggleGroupItem
            value="active"
            aria-label="Active projects"
            className="text-primary-foreground hover:bg-primary-foreground/20 data-[state=on]:bg-background data-[state=on]:text-primary data-[state=on]:shadow-sm px-3 py-1.5 text-sm"
          >
            Active
          </ToggleGroupItem>
          <ToggleGroupItem
            value="recurring"
            aria-label="Recurring projects"
            className="text-primary-foreground hover:bg-primary-foreground/20 data-[state=on]:bg-background data-[state=on]:text-primary data-[state=on]:shadow-sm px-3 py-1.5 text-sm"
          >
            Recurring
          </ToggleGroupItem>
          <ToggleGroupItem
            value="posted"
            aria-label="Posted projects"
            className="text-primary-foreground hover:bg-primary-foreground/20 data-[state=on]:bg-background data-[state=on]:text-primary data-[state=on]:shadow-sm px-3 py-1.5 text-sm"
          >
            Posted
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <FolderOpen className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">
              {{ all: 'All Projects', active: 'Active Projects', recurring: 'Recurring Projects', posted: 'Posted Projects' }[projectFilter]}
            </h2>
          </div>

          {(standaloneProjects.length > 0 || shiftGroups.length > 0) ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {shiftGroups.flatMap(group => group.projects.map(project => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  personnel={personnel}
                  getPersonnelById={getPersonnelById}
                  getInitials={getInitials}
                  onClick={() => onSelectProject(project)}
                  groupColor={group.color}
                />
              )))}
              {standaloneProjects.map((project) => (
                <ProjectCard 
                  key={project.id} 
                  project={project} 
                  personnel={personnel}
                  getPersonnelById={getPersonnelById}
                  getInitials={getInitials}
                  onClick={() => onSelectProject(project)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">🚀</div>
              <p className="text-muted-foreground">No active projects</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Collapsible open={previousOpen} onOpenChange={setPreviousOpen}>
        <Card className="border-border/50">
          <CardContent className="p-6">
            <CollapsibleTrigger className="flex items-center gap-2 mb-4 w-full group">
              <CheckCircle className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold text-foreground">Previous Projects</h2>
              <Badge variant="secondary" className="ml-1">{completedProjects.length}</Badge>
              <ChevronDown className="h-4 w-4 text-muted-foreground ml-auto transition-transform duration-200 group-data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              {completedProjects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {completedProjects.map((project) => (
                    <ProjectCard 
                      key={project.id} 
                      project={project}
                      personnel={personnel}
                      getPersonnelById={getPersonnelById}
                      getInitials={getInitials}
                      onClick={() => onSelectProject(project)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-4xl mb-3">✅</div>
                  <p className="text-muted-foreground">No completed projects</p>
                </div>
              )}
            </CollapsibleContent>
          </CardContent>
        </Card>
      </Collapsible>

      {/* Invitation Log Section */}
      <InvitationLog projects={projects} personnel={personnel} />
    </div>
  );
}

// Single Project Card
interface ProjectCardProps {
  project: Project;
  personnel: Personnel[];
  getPersonnelById: (id: string) => Personnel | undefined;
  getInitials: (name: string) => string;
  onClick: () => void;
  groupColor?: string;
}

function ProjectCard({ project, getPersonnelById, getInitials, onClick, groupColor }: ProjectCardProps) {
  const config = statusConfig[project.status];
  const StatusIcon = config.icon;
  const assignedPersonnel = project.assignedPersonnel
    .map(getPersonnelById)
    .filter((p): p is Personnel => p !== undefined);

  const isPosted = project.isPosted;

  const { data: applicantCount = 0 } = useQuery({
    queryKey: ['project-applicant-count', project.id],
    queryFn: async () => {
      const { count } = await supabase
        .from('project_applications')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', project.id)
        .neq('status', 'rejected');
      return count ?? 0;
    },
    enabled: isPosted,
  });

  // Rotation status text
  const rotationStatusText = (() => {
    if (!project.isRecurring || !project.autoCloseEnabled || !project.rotationOnDays) return null;
    const completed = project.rotationsCompleted || 0;
    const total = project.rotationCount || 1;
    if (project.status === 'active' && project.nextCloseDate) {
      const daysUntilClose = Math.ceil((new Date(project.nextCloseDate).getTime() - Date.now()) / 86400000);
      return `Rotation ${completed + 1} of ${total} · Auto-closes in ${daysUntilClose} day${daysUntilClose !== 1 ? 's' : ''}`;
    }
    if (project.status === 'pending' && project.nextOpenDate) {
      const daysUntilOpen = Math.ceil((new Date(project.nextOpenDate).getTime() - Date.now()) / 86400000);
      return `Next rotation starts in ${daysUntilOpen} day${daysUntilOpen !== 1 ? 's' : ''}`;
    }
    if (project.status === 'completed' && total > 1) {
      return `All ${total} rotations completed`;
    }
    return null;
  })();

  // Build background tint style for shift group cards
  const tintStyle: React.CSSProperties | undefined = groupColor
    ? { backgroundColor: `${groupColor}1A` }
    : undefined;

  return (
    <Card 
      className={`h-full hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer hover:ring-2 hover:ring-[#C4B5FD] hover:shadow-[#C4B5FD]/20 flex flex-col ${project.isRecurring && !groupColor ? 'bg-teal-500/10 border-teal-500/50' : isPosted ? 'bg-[#C4B5FD]/10 border-[#C4B5FD]/50' : ''}`} 
      onClick={onClick}
      style={tintStyle}
    >
      {/* ZONE 1: Header — image + name + badges (reserved 2-badge-row height) */}
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            {project.imageUrl ? (
              <img
                src={project.imageUrl}
                alt={project.name}
                className="h-10 w-10 rounded-lg object-cover border border-border shrink-0"
              />
            ) : (
              <div className="h-10 w-10 rounded-lg border border-border shrink-0 bg-muted flex items-center justify-center text-lg">
                📋
              </div>
            )}
            <CardTitle className="text-base font-medium line-clamp-2">{project.name}</CardTitle>
          </div>
          {/* Badge rail — fixed min-h for 2 badge rows so all cards match */}
          <div className="flex flex-col gap-0.5 items-end shrink-0 min-h-[3.25rem]">
            {isPosted && (
              <Badge className="bg-[#C4B5FD] text-[#4338CA] border-[#C4B5FD]">
                <Megaphone className="h-3 w-3 mr-1" />
                Posted
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
            {project.shiftGroupId && project.shiftNumber && (
              <Badge
                className={groupColor ? '' : 'bg-teal-500/20 text-teal-700 dark:text-teal-300 border-teal-500/50'}
                style={groupColor ? { backgroundColor: `${groupColor}33`, color: groupColor, borderColor: `${groupColor}80` } : undefined}
              >
                <Layers className="h-3 w-3 mr-1" />
                Shift {project.shiftNumber}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col flex-1">
        {/* ZONE 2: Description — always 1 line reserved */}
        <div className="h-5 mb-1.5">
          <p className="text-sm text-muted-foreground truncate">{project.description}</p>
        </div>

        {/* ZONE 3: Rotation status — always 1 line reserved */}
        <div className="h-4 mb-1.5">
          {rotationStatusText && (
            <p className="text-xs font-medium text-teal-600 dark:text-teal-400 truncate">{rotationStatusText}</p>
          )}
        </div>

        {/* ZONE 4: Personnel row — always fixed height reserved */}
        <div className="flex items-center gap-1 h-8 mb-1.5">
          {assignedPersonnel.length > 0 ? (
            <>
              <div className="flex -space-x-2">
                {assignedPersonnel.slice(0, 5).map((person) => (
                  <Avatar key={person.id} className="h-6 w-6 border-2 border-background">
                    <AvatarImage src={person.avatarUrl} alt={person.name} />
                    <AvatarFallback className="text-[10px]">
                      {getInitials(person.name)}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
              {assignedPersonnel.length > 5 && (
                <span className="text-xs text-muted-foreground ml-1">
                  +{assignedPersonnel.length - 5} more
                </span>
              )}
              <span className="ml-auto flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span>{assignedPersonnel.filter(p => p.category !== 'freelancer').length} Employees</span>
                <span className="text-border">|</span>
                <span>{assignedPersonnel.filter(p => p.category === 'freelancer').length} Freelancers</span>
                {isPosted && (
                  <>
                    <span className="text-border">|</span>
                    <span>{applicantCount} Applicant{applicantCount !== 1 ? 's' : ''}</span>
                  </>
                )}
              </span>
            </>
          ) : isPosted ? (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users className="h-4 w-4" />
              {applicantCount} Applicant{applicantCount !== 1 ? 's' : ''}
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users className="h-4 w-4" />
              No personnel assigned
            </span>
          )}
        </div>

        {/* ZONE 5: Footer — dates + location, always 1 line reserved */}
        <div className="h-4 mt-auto">
          <div className="text-xs text-muted-foreground flex items-center gap-x-3 truncate">
            <span>Start: {new Date(project.startDate).toLocaleDateString()}</span>
            <span>End: {project.endDate ? new Date(project.endDate).toLocaleDateString() : '—'}</span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3 shrink-0" />
              {project.projectLocationLabel || project.location || '—'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
