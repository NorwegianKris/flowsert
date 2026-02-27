import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { FolderOpen, Clock, CheckCircle, ChevronDown, Megaphone, Users, MapPin, Repeat, SlidersHorizontal } from 'lucide-react';
import { Project } from '@/hooks/useProjects';
import { Personnel } from '@/types';
import { InvitationLog } from '@/components/InvitationLog';

interface ProjectsTabProps {
  projects: Project[];
  personnel: Personnel[];
  onSelectProject: (project: Project) => void;
}

const statusConfig = {
  active: { label: 'Active', variant: 'active' as const, icon: Clock },
  completed: { label: 'Completed', variant: 'completed' as const, icon: CheckCircle },
  pending: { label: 'Pending', variant: 'outline' as const, icon: Clock },
};

export function ProjectsTab({ projects, personnel, onSelectProject }: ProjectsTabProps) {
  const [previousOpen, setPreviousOpen] = useState(false);
  const [includePosted, setIncludePosted] = useState(true);
  const [includeRecurring, setIncludeRecurring] = useState(true);
  
  // Filter projects based on toggles
  const filteredProjects = projects.filter(p => {
    if (!includePosted && p.isPosted) return false;
    if (!includeRecurring && p.isRecurring) return false;
    return true;
  });
  
  const activeProjects = filteredProjects.filter((p) => p.status === 'active' || p.status === 'pending');
  const completedProjects = filteredProjects.filter((p) => p.status === 'completed');
  const postedProjectsCount = projects.filter(p => p.isPosted).length;
  const recurringProjectsCount = projects.filter(p => p.isRecurring).length;

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
      {/* Project View Filter Bar */}
      <div className="py-3 px-4 bg-[#C4B5FD]/10 rounded-lg border border-[#C4B5FD]/50">
        <div className="flex items-center gap-2 text-muted-foreground mb-2">
          <SlidersHorizontal className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Project view:</span>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Switch
              id="includePosted"
              checked={includePosted}
              onCheckedChange={setIncludePosted}
            />
            <Label htmlFor="includePosted" className="text-sm cursor-pointer flex items-center gap-1.5">
              <Megaphone className="h-3.5 w-3.5" />
              Show posted projects
            </Label>
            <Badge variant="secondary">{postedProjectsCount}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="includeRecurring"
              checked={includeRecurring}
              onCheckedChange={setIncludeRecurring}
            />
            <Label htmlFor="includeRecurring" className="text-sm cursor-pointer flex items-center gap-1.5">
              <Repeat className="h-3.5 w-3.5" />
              Show recurring projects
            </Label>
            <Badge variant="secondary">{recurringProjectsCount}</Badge>
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-4">
          <FolderOpen className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Active & Upcoming Projects</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {activeProjects.map((project) => (
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
        {activeProjects.length === 0 && (
          <div className="text-center py-8">
            <div className="text-4xl mb-3">🚀</div>
            <p className="text-muted-foreground">No active projects</p>
          </div>
        )}
      </div>

      <Collapsible open={previousOpen} onOpenChange={setPreviousOpen}>
        <CollapsibleTrigger className="flex items-center gap-2 mb-4 w-full group">
          <CheckCircle className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">Previous Projects</h2>
          <Badge variant="secondary" className="ml-1">{completedProjects.length}</Badge>
          <ChevronDown className="h-4 w-4 text-muted-foreground ml-auto transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent>
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
          {completedProjects.length === 0 && (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">✅</div>
              <p className="text-muted-foreground">No completed projects</p>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* Invitation Log Section */}
      <InvitationLog projects={projects} personnel={personnel} />
    </div>
  );
}

interface ProjectCardProps {
  project: Project;
  personnel: Personnel[];
  getPersonnelById: (id: string) => Personnel | undefined;
  getInitials: (name: string) => string;
  onClick: () => void;
}

function ProjectCard({ project, getPersonnelById, getInitials, onClick }: ProjectCardProps) {
  const config = statusConfig[project.status];
  const StatusIcon = config.icon;
  const assignedPersonnel = project.assignedPersonnel
    .map(getPersonnelById)
    .filter((p): p is Personnel => p !== undefined);

  const isPosted = project.isPosted;

  const [applicantCount, setApplicantCount] = useState(0);
  useEffect(() => {
    if (!isPosted) return;
    supabase
      .from('project_applications')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', project.id)
      .neq('status', 'rejected')
      .then(({ count }) => setApplicantCount(count ?? 0));
  }, [isPosted, project.id]);

  return (
    <Card 
      className={`hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer hover:ring-2 hover:ring-[#C4B5FD] hover:shadow-[#C4B5FD]/20 flex flex-col ${project.isRecurring ? 'bg-teal-500/10 border-teal-500/50' : isPosted ? 'bg-[#C4B5FD]/10 border-[#C4B5FD]/50' : ''}`} 
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            {project.imageUrl && (
              <img
                src={project.imageUrl}
                alt={project.name}
                className="h-10 w-10 rounded-lg object-cover border border-border shrink-0"
              />
            )}
            <CardTitle className="text-base font-medium line-clamp-2">{project.name}</CardTitle>
          </div>
          {isPosted ? (
            <Badge className="bg-[#C4B5FD] text-[#4338CA] border-[#C4B5FD] shrink-0">
              <Megaphone className="h-3 w-3 mr-1" />
              Posted
            </Badge>
          ) : (
            <Badge variant={config.variant} className="shrink-0">
              <StatusIcon className="h-3 w-3 mr-1" />
              {config.label}
            </Badge>
          )}
          {project.isRecurring && (
            <Badge className="bg-teal-500/20 text-teal-700 dark:text-teal-300 border-teal-500/50 shrink-0">
              <Repeat className="h-3 w-3 mr-1" />
              Every {project.recurringIntervalLabel || `${project.recurringIntervalDays} days`}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col flex-1">
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{project.description}</p>
        
        {assignedPersonnel.length > 0 && (
          <div className="flex items-center gap-1 mb-3">
            <div className="flex -space-x-2">
              {assignedPersonnel.slice(0, 4).map((person) => (
                <Avatar key={person.id} className="h-6 w-6 border-2 border-background">
                  <AvatarImage src={person.avatarUrl} alt={person.name} />
                  <AvatarFallback className="text-[10px]">
                    {getInitials(person.name)}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
            {assignedPersonnel.length > 4 && (
              <span className="text-xs text-muted-foreground ml-1">
                +{assignedPersonnel.length - 4} more
              </span>
            )}
            <span className="text-[10px] text-muted-foreground ml-auto flex items-center gap-1.5">
              <span>{assignedPersonnel.filter(p => p.category !== 'freelancer').length} Employees</span>
              <span className="text-border">|</span>
              <span>{assignedPersonnel.filter(p => p.category === 'freelancer').length} Freelancers</span>
            </span>
          </div>
        )}
        
        {isPosted && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
            <Users className="h-3.5 w-3.5 text-primary" />
            <span>{applicantCount} Applicant{applicantCount !== 1 ? 's' : ''}</span>
          </div>
        )}
        <div className="mt-auto text-xs text-muted-foreground flex flex-wrap gap-x-3">
          <span>Start: {new Date(project.startDate).toLocaleDateString()}</span>
          {project.endDate && (
            <span>End: {new Date(project.endDate).toLocaleDateString()}</span>
          )}
          {(project.projectLocationLabel || project.location) && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {project.projectLocationLabel || project.location}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
