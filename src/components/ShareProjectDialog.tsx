import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Project } from '@/hooks/useProjects';
import { Personnel } from '@/types';
import { Copy, Check, Mail, Link } from 'lucide-react';
import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';

interface ShareProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
  personnel: Personnel[];
}

export function ShareProjectDialog({
  open,
  onOpenChange,
  project,
  personnel,
}: ShareProjectDialogProps) {
  const [copied, setCopied] = useState(false);

  const assignedPersonnel = project.assignedPersonnel
    .map((id) => personnel.find((p) => p.id === id))
    .filter((p): p is Personnel => p !== undefined);

  const generateShareText = () => {
    const lines = [
      `PROJECT: ${project.name}`,
      `Status: ${project.status.charAt(0).toUpperCase() + project.status.slice(1)}`,
      '',
      `Description: ${project.description}`,
      '',
      `Duration: ${format(parseISO(project.startDate), 'MMM d, yyyy')} - ${project.endDate ? format(parseISO(project.endDate), 'MMM d, yyyy') : 'Ongoing'}`,
      '',
      `Assigned Personnel (${assignedPersonnel.length}):`,
      ...assignedPersonnel.map((p) => `  • ${p.name} - ${p.role}`),
    ];

    if (project.calendarItems && project.calendarItems.length > 0) {
      lines.push('', `Calendar Items (${project.calendarItems.length}):`);
      project.calendarItems.forEach((item) => {
        lines.push(`  • ${format(parseISO(item.date), 'MMM d, yyyy')}: ${item.description}`);
      });
    }

    return lines.join('\n');
  };

  const shareText = generateShareText();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      toast.success('Project details copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleEmailShare = () => {
    const subject = encodeURIComponent(`Project Details: ${project.name}`);
    const body = encodeURIComponent(shareText);
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            Share Project
          </DialogTitle>
          <DialogDescription>
            Share the project details with team members or external stakeholders.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Project Summary</Label>
            <div className="relative">
              <textarea
                readOnly
                value={shareText}
                className="w-full h-48 p-3 text-sm bg-muted rounded-md border border-border resize-none focus:outline-none"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="active" onClick={handleCopy} className="flex-1 gap-2">
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy to Clipboard
                </>
              )}
            </Button>
            <Button variant="outline" onClick={handleEmailShare} className="gap-2">
              <Mail className="h-4 w-4" />
              Email
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
