import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FolderOpen, Clock, CheckCircle } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  status: 'active' | 'completed' | 'pending';
  description: string;
  startDate: string;
  endDate?: string;
}

const dummyProjects: Project[] = [
  {
    id: '1',
    name: 'Offshore Wind Farm Installation',
    status: 'active',
    description: 'Installation and commissioning of offshore wind turbines in the North Sea.',
    startDate: '2025-01-01',
    endDate: '2025-06-30',
  },
  {
    id: '2',
    name: 'Platform Maintenance Q1',
    status: 'active',
    description: 'Quarterly maintenance operations for Platform Alpha.',
    startDate: '2025-01-15',
    endDate: '2025-03-15',
  },
  {
    id: '3',
    name: 'Emergency Response Training',
    status: 'pending',
    description: 'Annual emergency response and safety training program.',
    startDate: '2025-02-01',
  },
  {
    id: '4',
    name: 'Pipeline Inspection 2024',
    status: 'completed',
    description: 'Annual pipeline inspection and integrity assessment.',
    startDate: '2024-09-01',
    endDate: '2024-11-30',
  },
  {
    id: '5',
    name: 'Rig Decommissioning Phase 1',
    status: 'completed',
    description: 'First phase of rig decommissioning operations.',
    startDate: '2024-06-01',
    endDate: '2024-08-31',
  },
];

const statusConfig = {
  active: { label: 'Active', variant: 'default' as const, icon: Clock },
  completed: { label: 'Completed', variant: 'secondary' as const, icon: CheckCircle },
  pending: { label: 'Pending', variant: 'outline' as const, icon: Clock },
};

export function ProjectsTab() {
  const activeProjects = dummyProjects.filter((p) => p.status === 'active' || p.status === 'pending');
  const completedProjects = dummyProjects.filter((p) => p.status === 'completed');

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-4">
          <FolderOpen className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Active & Upcoming Projects</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {activeProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
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
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
        {completedProjects.length === 0 && (
          <p className="text-muted-foreground text-center py-8">No completed projects</p>
        )}
      </div>
    </div>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const config = statusConfig[project.status];
  const StatusIcon = config.icon;

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer">
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
