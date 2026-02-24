import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle, XCircle, Clock, User, MessageSquare } from 'lucide-react';
import { useProjectApplications, ProjectApplication } from '@/hooks/useProjectApplications';
import { format, parseISO } from 'date-fns';

interface ProjectApplicationsListProps {
  projectId: string;
}

export function ProjectApplicationsList({ projectId }: ProjectApplicationsListProps) {
  const { applications, loading, updateApplicationStatus } = useProjectApplications(projectId);
  const [selectedApp, setSelectedApp] = useState<ProjectApplication | null>(null);
  const [updating, setUpdating] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleStatusUpdate = async (status: 'accepted' | 'rejected') => {
    if (!selectedApp) return;
    setUpdating(true);
    await updateApplicationStatus(selectedApp.id, status);
    setUpdating(false);
    setSelectedApp(null);
  };

  const handleInlineStatusUpdate = async (applicationId: string, status: 'accepted' | 'rejected') => {
    setUpdatingId(applicationId);
    await updateApplicationStatus(applicationId, status);
    setUpdatingId(null);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  const visibleApplications = applications.filter(app => app.status !== 'rejected');

  if (visibleApplications.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-3">📩</div>
        <p className="text-muted-foreground text-sm">No applications yet</p>
      </div>
    );
  }

  const statusConfig = {
    pending: { icon: Clock, variant: 'secondary' as const, color: 'text-amber-500' },
    accepted: { icon: CheckCircle, variant: 'default' as const, color: 'text-emerald-500' },
    rejected: { icon: XCircle, variant: 'destructive' as const, color: 'text-destructive' },
  };

  return (
    <>
      <div className="space-y-3">
        {visibleApplications.map(app => {
          const config = statusConfig[app.status as keyof typeof statusConfig] || statusConfig.pending;
          const StatusIcon = config.icon;
          return (
            <div
              key={app.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-white dark:bg-card border border-border hover:shadow-sm transition-all cursor-pointer"
              onClick={() => setSelectedApp(app)}
            >
              <Avatar className="h-10 w-10">
                <AvatarImage src={app.personnelAvatarUrl} />
                <AvatarFallback>
                  {app.personnelName ? getInitials(app.personnelName) : <User className="h-4 w-4" />}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground text-sm truncate">{app.personnelName || 'Unknown'}</p>
                <p className="text-xs text-muted-foreground truncate">{app.personnelRole}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground hidden sm:inline">
                  {format(parseISO(app.createdAt), 'MMM d')}
                </span>
                <Badge variant={config.variant} className="gap-1 text-xs">
                  <StatusIcon className="h-3 w-3" />
                  {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                </Badge>
                {app.status === 'pending' && (
                  <>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                      disabled={updatingId === app.id}
                      onClick={(e) => { e.stopPropagation(); handleInlineStatusUpdate(app.id, 'accepted'); }}
                    >
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive hover:bg-red-50 hover:text-red-700"
                      disabled={updatingId === app.id}
                      onClick={(e) => { e.stopPropagation(); handleInlineStatusUpdate(app.id, 'rejected'); }}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Application Detail Dialog */}
      <Dialog open={!!selectedApp} onOpenChange={(open) => { if (!open) setSelectedApp(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Application Details</DialogTitle>
          </DialogHeader>
          {selectedApp && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={selectedApp.personnelAvatarUrl} />
                  <AvatarFallback>
                    {selectedApp.personnelName ? getInitials(selectedApp.personnelName) : <User className="h-5 w-5" />}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-foreground">{selectedApp.personnelName}</p>
                  <p className="text-sm text-muted-foreground">{selectedApp.personnelRole}</p>
                  <p className="text-xs text-muted-foreground">{selectedApp.personnelEmail}</p>
                </div>
              </div>

              <div className="rounded-lg bg-white dark:bg-card border border-border p-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                  <MessageSquare className="h-3 w-3" />
                  Application Message
                </div>
                <p className="text-sm text-foreground">{selectedApp.initialMessage}</p>
              </div>

              <p className="text-xs text-muted-foreground">
                Applied {format(parseISO(selectedApp.createdAt), 'MMM d, yyyy \'at\' h:mm a')}
              </p>
            </div>
          )}
          {selectedApp?.status === 'pending' && (
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => handleStatusUpdate('rejected')}
                disabled={updating}
                className="text-red-600 hover:text-red-700"
              >
                <XCircle className="h-4 w-4 mr-1" />
                Reject
              </Button>
              <Button
                onClick={() => handleStatusUpdate('accepted')}
                disabled={updating}
                className="bg-emerald-600 text-white hover:bg-emerald-700"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Accept
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
