import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Briefcase, Calendar, MapPin, Clock, Send, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { usePostedProjects, PostedProject } from '@/hooks/usePostedProjects';
import { useProjectApplications, ProjectApplication } from '@/hooks/useProjectApplications';
import { format, parseISO } from 'date-fns';

interface PostedProjectsProps {
  personnelId: string;
  businessId: string;
}

export function PostedProjects({ personnelId, businessId }: PostedProjectsProps) {
  const { projects, loading } = usePostedProjects();
  const { submitApplication, getMyApplications, cancelApplication } = useProjectApplications();
  const [myApplications, setMyApplications] = useState<ProjectApplication[]>([]);
  const [selectedProject, setSelectedProject] = useState<PostedProject | null>(null);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (personnelId) {
      getMyApplications(personnelId).then(setMyApplications);
    }
  }, [personnelId, getMyApplications]);

  const getApplicationStatus = (projectId: string) => {
    return myApplications.find(a => a.projectId === projectId);
  };

  const handleSubmit = async () => {
    if (!selectedProject || !message.trim()) return;
    setSubmitting(true);
    const success = await submitApplication(selectedProject.id, personnelId, businessId, message.trim());
    if (success) {
      const updated = await getMyApplications(personnelId);
      setMyApplications(updated);
      setSelectedProject(null);
      setMessage('');
    }
    setSubmitting(false);
  };

  const handleCancel = async () => {
    const application = selectedProject ? getApplicationStatus(selectedProject.id) : null;
    if (!application) return;
    setCancelling(true);
    const success = await cancelApplication(application.id);
    if (success) {
      const updated = await getMyApplications(personnelId);
      setMyApplications(updated);
      setSelectedProject(null);
    }
    setCancelling(false);
  };

  const selectedApplication = selectedProject ? getApplicationStatus(selectedProject.id) : null;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (projects.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-violet-500" />
            Posted Projects
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <div className="text-3xl mb-2">📋</div>
            <p className="text-sm text-muted-foreground">No posted projects available right now</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-violet-500" />
            Posted Projects
            <Badge variant="secondary" className="ml-auto">{projects.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {projects.map(project => {
            const application = getApplicationStatus(project.id);
            return (
              <div
                key={project.id}
                className="p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => setSelectedProject(project)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-foreground text-sm truncate">{project.name}</h4>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{project.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(parseISO(project.startDate), 'MMM d, yyyy')}
                      </span>
                      {(project.projectLocationLabel || project.projectCountry || project.location) && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {project.projectLocationLabel || (project.projectCountry
                            ? project.projectCountry.replace(/\b\w/g, c => c.toUpperCase())
                            : project.location)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    {application ? (
                      <Badge
                        variant={
                          application.status === 'accepted' ? 'default' :
                          application.status === 'rejected' ? 'destructive' : 'secondary'
                        }
                        className="text-xs whitespace-nowrap"
                      >
                        {application.status === 'accepted' && <CheckCircle className="h-3 w-3 mr-1" />}
                        {application.status === 'rejected' && <XCircle className="h-3 w-3 mr-1" />}
                        {application.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                        {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs whitespace-nowrap text-violet-600 border-violet-200">
                        Apply
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Dialog open={!!selectedProject} onOpenChange={(open) => { if (!open) { setSelectedProject(null); setMessage(''); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-violet-500" />
              {selectedApplication ? 'Project Details' : 'Request to Join'}
            </DialogTitle>
          </DialogHeader>
          {selectedProject && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-3">
                <h4 className="font-medium text-sm">{selectedProject.name}</h4>
                <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{selectedProject.description}</p>
                <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(parseISO(selectedProject.startDate), 'MMM d, yyyy')}
                  </span>
                  {(selectedProject.projectLocationLabel || selectedProject.projectCountry || selectedProject.location) && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {selectedProject.projectLocationLabel || (selectedProject.projectCountry
                        ? selectedProject.projectCountry.replace(/\b\w/g, c => c.toUpperCase())
                        : selectedProject.location)}
                    </span>
                  )}
                </div>
              </div>

              {/* No application: show apply form */}
              {!selectedApplication && (
                <div className="space-y-2">
                  <Label htmlFor="application-message">Why would you like to join this project?</Label>
                  <Textarea
                    id="application-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Describe your interest, relevant experience, and availability..."
                    rows={4}
                  />
                </div>
              )}

              {/* Pending: show cancel option */}
              {selectedApplication?.status === 'pending' && (
                <div className="rounded-lg border border-border p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Application Pending</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Your application is awaiting review. You can cancel it if you've changed your mind.
                  </p>
                </div>
              )}

              {/* Accepted/Rejected: read-only status */}
              {selectedApplication && selectedApplication.status !== 'pending' && (
                <div className="flex items-center gap-2">
                  {selectedApplication.status === 'accepted' && <CheckCircle className="h-4 w-4 text-green-600" />}
                  {selectedApplication.status === 'rejected' && <XCircle className="h-4 w-4 text-destructive" />}
                  <Badge
                    variant={selectedApplication.status === 'accepted' ? 'default' : 'destructive'}
                  >
                    {selectedApplication.status.charAt(0).toUpperCase() + selectedApplication.status.slice(1)}
                  </Badge>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setSelectedProject(null); setMessage(''); }}>
              {selectedApplication && selectedApplication.status !== 'pending' ? 'Close' : 'Cancel'}
            </Button>
            {!selectedApplication && (
              <Button onClick={handleSubmit} disabled={!message.trim() || submitting}>
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Submit Application
              </Button>
            )}
            {selectedApplication?.status === 'pending' && (
              <Button variant="destructive" onClick={handleCancel} disabled={cancelling}>
                {cancelling && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Cancel Application
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
