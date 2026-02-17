import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { FolderOpen, Clock, CheckCircle, ChevronDown, Megaphone, Users } from 'lucide-react';
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
  const [includePosted, setIncludePosted] = useState(false);
  
  // Filter projects based on posted toggle
  const filteredProjects = includePosted 
    ? projects 
    : projects.filter(p => !p.isPosted);
  
  const activeProjects = filteredProjects.filter((p) => p.status === 'active' || p.status === 'pending');
  const completedProjects = filteredProjects.filter((p) => p.status === 'completed');
  const postedProjectsCount = projects.filter(p => p.isPosted).length;

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
      {/* Posted Projects Toggle */}
      {postedProjectsCount > 0 && (
        <div className="flex items-center gap-6 py-3 px-4 bg-primary/5 rounded-lg border border-primary/20">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Megaphone className="h-4 w-4" />
            <span className="text-sm font-medium">Posted Projects:</span>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="includePosted"
              checked={includePosted}
              onCheckedChange={setIncludePosted}
            />
            <Label htmlFor="includePosted" className="text-sm cursor-pointer">
              Show posted projects
            </Label>
            <Badge variant="secondary" className="ml-2">{postedProjectsCount}</Badge>
          </div>
        </div>
      )}

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
      .then(({ count }) => setApplicantCount(count ?? 0));
  }, [isPosted, project.id]);

  return (
    <Card 
      className="hover:shadow-md transition-shadow cursor-pointer"
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
            {isPosted && (
              <Badge variant="secondary" className="shrink-0">
                Posted
              </Badge>
            )}
          </div>
          <Badge variant={config.variant} className="shrink-0">
            <StatusIcon className="h-3 w-3 mr-1" />
            {config.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
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
          </div>
        )}
        
        <div className="text-xs text-muted-foreground">
          <span>Start: {new Date(project.startDate).toLocaleDateString()}</span>
          {project.endDate && (
            <span className="ml-3">End: {new Date(project.endDate).toLocaleDateString()}</span>
          )}
        </div>
        {isPosted && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2">
            <Users className="h-3.5 w-3.5 text-primary" />
            <span>{applicantCount} Applicant{applicantCount !== 1 ? 's' : ''}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
