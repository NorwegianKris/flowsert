import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Project } from '@/hooks/useProjects';
import { useProjectInvitations } from '@/hooks/useProjectInvitations';
import { FolderOpen, Clock, CheckCircle, Send } from 'lucide-react';
import { toast } from 'sonner';

interface RequestProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  personnelId: string;
  personnelName: string;
  projects: Project[];
  existingInvitations: string[]; // project IDs that already have invitations
}

const statusConfig = {
  active: { label: 'Active', variant: 'default' as const, icon: Clock },
  completed: { label: 'Completed', variant: 'secondary' as const, icon: CheckCircle },
  pending: { label: 'Pending', variant: 'outline' as const, icon: Clock },
};

export function RequestProjectDialog({
  open,
  onOpenChange,
  personnelId,
  personnelName,
  projects,
  existingInvitations,
}: RequestProjectDialogProps) {
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const { sendInvitation } = useProjectInvitations();

  const availableProjects = projects.filter(
    (p) => p.status !== 'completed' && !existingInvitations.includes(p.id)
  );

  const handleSend = async () => {
    if (!selectedProject) return;

    setIsSending(true);
    const success = await sendInvitation(selectedProject, personnelId);
    setIsSending(false);

    if (success) {
      toast.success(`Project invitation sent to ${personnelName}`);
      setSelectedProject(null);
      onOpenChange(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setSelectedProject(null);
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            Request for Project
          </DialogTitle>
          <DialogDescription>
            Send a project invitation to {personnelName}. They can accept or decline.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {availableProjects.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No available projects to invite to. All active projects already have invitations sent.
            </p>
          ) : (
            <ScrollArea className="h-64 border rounded-md p-2">
              <div className="space-y-2">
                {availableProjects.map((project) => {
                  const config = statusConfig[project.status];
                  const StatusIcon = config.icon;
                  const isSelected = selectedProject === project.id;

                  return (
                    <button
                      key={project.id}
                      onClick={() => setSelectedProject(project.id)}
                      className={`w-full text-left p-3 rounded-md transition-colors ${
                        isSelected
                          ? 'bg-primary/10 border-2 border-primary'
                          : 'hover:bg-muted border border-transparent'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <FolderOpen className="h-4 w-4 text-primary shrink-0" />
                            <p className="font-medium text-sm truncate">{project.name}</p>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {project.description}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Start: {new Date(project.startDate).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant={config.variant} className="shrink-0 text-xs">
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {config.label}
                        </Badge>
                      </div>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={!selectedProject || isSending}
            >
              {isSending ? 'Sending...' : 'Send Invitation'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
