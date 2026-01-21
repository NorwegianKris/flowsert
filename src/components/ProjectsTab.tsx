import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { FolderOpen, Clock, CheckCircle } from 'lucide-react';
import { Project } from '@/hooks/useProjects';
import { Personnel } from '@/types';
import { InvitationLog } from '@/components/InvitationLog';

interface ProjectsTabProps {
  projects: Project[];
  personnel: Personnel[];
  onSelectProject: (project: Project) => void;
}

const statusConfig = {
  active: { label: 'Active', variant: 'default' as const, icon: Clock },
  completed: { label: 'Completed', variant: 'secondary' as const, icon: CheckCircle },
  pending: { label: 'Pending', variant: 'outline' as const, icon: Clock },
};

export function ProjectsTab({ projects, personnel, onSelectProject }: ProjectsTabProps) {
  const activeProjects = projects.filter((p) => p.status === 'active' || p.status === 'pending');
  const completedProjects = projects.filter((p) => p.status === 'completed');

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

      <div>
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">Previous Projects</h2>
        </div>
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
      </div>

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

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={onClick}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base font-medium line-clamp-2">{project.name}</CardTitle>
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
      </CardContent>
    </Card>
  );
}
