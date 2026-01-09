import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Project } from '@/types/project';
import { Personnel } from '@/types';
import { toast } from 'sonner';

interface EditProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
  personnel: Personnel[];
  onSave: (project: Project) => void;
}

export function EditProjectDialog({
  open,
  onOpenChange,
  project,
  personnel,
  onSave,
}: EditProjectDialogProps) {
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description);
  const [status, setStatus] = useState<'active' | 'completed' | 'pending'>(project.status);
  const [startDate, setStartDate] = useState(project.startDate);
  const [endDate, setEndDate] = useState(project.endDate || '');
  const [assignedPersonnel, setAssignedPersonnel] = useState<string[]>(project.assignedPersonnel);

  useEffect(() => {
    if (open) {
      setName(project.name);
      setDescription(project.description);
      setStatus(project.status);
      setStartDate(project.startDate);
      setEndDate(project.endDate || '');
      setAssignedPersonnel(project.assignedPersonnel);
    }
  }, [open, project]);

  const handlePersonnelToggle = (personnelId: string, checked: boolean) => {
    if (checked) {
      setAssignedPersonnel([...assignedPersonnel, personnelId]);
    } else {
      setAssignedPersonnel(assignedPersonnel.filter((id) => id !== personnelId));
    }
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast.error('Project name is required');
      return;
    }
    if (!startDate) {
      toast.error('Start date is required');
      return;
    }

    onSave({
      ...project,
      name: name.trim(),
      description: description.trim(),
      status,
      startDate,
      endDate: endDate || undefined,
      assignedPersonnel,
    });
    onOpenChange(false);
    toast.success('Project updated successfully');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Project</DialogTitle>
          <DialogDescription>
            Make changes to the project details below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Project Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter project name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter project description"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={(val: 'active' | 'completed' | 'pending') => setStatus(val)}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Assigned Personnel</Label>
            <div className="border rounded-md p-3 max-h-[200px] overflow-y-auto space-y-2">
              {personnel.length > 0 ? (
                personnel.map((person) => (
                  <div key={person.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted/50">
                    <Checkbox
                      id={`person-${person.id}`}
                      checked={assignedPersonnel.includes(person.id)}
                      onCheckedChange={(checked) =>
                        handlePersonnelToggle(person.id, checked as boolean)
                      }
                    />
                    <label
                      htmlFor={`person-${person.id}`}
                      className="flex-1 cursor-pointer text-sm"
                    >
                      <span className="font-medium">{person.name}</span>
                      <span className="text-muted-foreground ml-2">({person.role})</span>
                    </label>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-2">
                  No personnel available
                </p>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {assignedPersonnel.length} personnel selected
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
