import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Project } from '@/hooks/useProjects';

interface AddMasterCalendarItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: Project[];
  onAdd: (projectId: string, date: string, description: string) => void;
}

export function AddMasterCalendarItemDialog({
  open,
  onOpenChange,
  projects,
  onAdd,
}: AddMasterCalendarItemDialogProps) {
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedProjectId && date && description) {
      onAdd(selectedProjectId, date, description);
      setSelectedProjectId('');
      setDate('');
      setDescription('');
      onOpenChange(false);
    }
  };

  const resetForm = () => {
    setSelectedProjectId('');
    setDate('');
    setDescription('');
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetForm();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Calendar Item</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="project-select">Project</Label>
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger id="project-select">
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="item-date">Date</Label>
            <Input
              id="item-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={selectedProject?.startDate}
              max={selectedProject?.endDate}
              required
              disabled={!selectedProjectId}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="item-description">Description</Label>
            <Textarea
              id="item-description"
              placeholder="Enter a short description for this calendar item..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={3}
              disabled={!selectedProjectId}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!selectedProjectId || !date || !description}>
              Add Item
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
