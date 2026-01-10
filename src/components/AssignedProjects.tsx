import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Briefcase, Calendar, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface Project {
  id: string;
  name: string;
  status: string;
  description: string;
  startDate: string;
  endDate?: string;
}

interface AssignedProjectsProps {
  personnelId: string;
}

export function AssignedProjects({ personnelId }: AssignedProjectsProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAssignedProjects() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .contains('assigned_personnel', [personnelId]);

        if (error) throw error;

        const mapped = (data || []).map((p) => ({
          id: p.id,
          name: p.name,
          status: p.status,
          description: p.description,
          startDate: p.start_date,
          endDate: p.end_date || undefined,
        }));

        setProjects(mapped);
      } catch (error) {
        console.error('Error fetching assigned projects:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchAssignedProjects();
  }, [personnelId]);

  const activeProjects = projects.filter((p) => p.status === 'active' || p.status === 'pending');
  const previousProjects = projects.filter((p) => p.status === 'completed');

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'completed':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const formatDateRange = (startDate: string, endDate?: string) => {
    const start = format(new Date(startDate), 'MMM d, yyyy');
    if (endDate) {
      const end = format(new Date(endDate), 'MMM d, yyyy');
      return `${start} - ${end}`;
    }
    return `${start} - Present`;
  };

  if (loading) {
    return (
      <Card className="border-border/50">
        <CardHeader className="py-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-primary" />
            Assigned Projects
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="py-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-primary" />
          Assigned Projects
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        {projects.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No projects assigned yet
          </p>
        ) : (
          <>
            {activeProjects.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Active Projects ({activeProjects.length})
                </h4>
                <div className="space-y-2">
                  {activeProjects.map((project) => (
                    <div
                      key={project.id}
                      className="p-3 rounded-lg border border-border/50 bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {project.name}
                          </p>
                          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>{formatDateRange(project.startDate, project.endDate)}</span>
                          </div>
                        </div>
                        <Badge variant={getStatusVariant(project.status)} className="text-xs capitalize shrink-0">
                          {project.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {previousProjects.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Previous Projects ({previousProjects.length})
                </h4>
                <div className="space-y-2">
                  {previousProjects.map((project) => (
                    <div
                      key={project.id}
                      className="p-3 rounded-lg border border-border/50 bg-muted/30"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {project.name}
                          </p>
                          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>{formatDateRange(project.startDate, project.endDate)}</span>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs capitalize shrink-0">
                          {project.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
