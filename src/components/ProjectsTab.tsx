import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { FolderOpen, Clock, CheckCircle, Calendar, Users } from 'lucide-react';
import { Project } from '@/types/project';
import { Personnel } from '@/types';

interface ProjectsTabProps {
  projects: Project[];
  personnel: Personnel[];
}

const statusConfig = {
  active: { label: 'Active', variant: 'default' as const, icon: Clock },
  completed: { label: 'Completed', variant: 'secondary' as const, icon: CheckCircle },
  pending: { label: 'Pending', variant: 'outline' as const, icon: Clock },
};

export function ProjectsTab({ projects, personnel }: ProjectsTabProps) {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
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

  const assignedPersonnel = selectedProject
    ? selectedProject.assignedPersonnel
        .map(getPersonnelById)
        .filter((p): p is Personnel => p !== undefined)
    : [];

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
              onClick={() => setSelectedProject(project)}
            />
          ))}
        </div>
        {activeProjects.length === 0 && (
          <p className="text-muted-foreground text-center py-8">No active projects</p>
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
              onClick={() => setSelectedProject(project)}
            />
          ))}
        </div>
        {completedProjects.length === 0 && (
          <p className="text-muted-foreground text-center py-8">No completed projects</p>
        )}
      </div>

      {/* Project Details Dialog */}
      <Dialog open={!!selectedProject} onOpenChange={(open) => !open && setSelectedProject(null)}>
        <DialogContent className="sm:max-w-lg">
          {selectedProject && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between gap-3">
                  <DialogTitle className="text-xl">{selectedProject.name}</DialogTitle>
                  <Badge variant={statusConfig[selectedProject.status].variant} className="shrink-0">
                    {(() => {
                      const StatusIcon = statusConfig[selectedProject.status].icon;
                      return <StatusIcon className="h-3 w-3 mr-1" />;
                    })()}
                    {statusConfig[selectedProject.status].label}
                  </Badge>
                </div>
                <DialogDescription className="text-left pt-2">
                  {selectedProject.description}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Duration:</span>
                  <span>{new Date(selectedProject.startDate).toLocaleDateString()}</span>
                  {selectedProject.endDate && (
                    <>
                      <span className="text-muted-foreground">—</span>
                      <span>{new Date(selectedProject.endDate).toLocaleDateString()}</span>
                    </>
                  )}
                </div>

                {assignedPersonnel.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Assigned Personnel ({assignedPersonnel.length})</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {assignedPersonnel.map((person) => (
                        <div key={person.id} className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={person.avatarUrl} alt={person.name} />
                            <AvatarFallback className="text-xs">
                              {getInitials(person.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{person.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{person.role}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
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
