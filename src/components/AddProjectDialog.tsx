import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Personnel } from '@/types';
import { Project } from '@/types/project';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface AddProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  personnel: Personnel[];
  onProjectAdded: (project: Project) => void;
}

export function AddProjectDialog({ open, onOpenChange, personnel, onProjectAdded }: AddProjectDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedPersonnel, setSelectedPersonnel] = useState<string[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newProject: Project = {
      id: crypto.randomUUID(),
      name,
      description,
      startDate,
      endDate: endDate || undefined,
      status: 'active',
      assignedPersonnel: selectedPersonnel,
    };

    onProjectAdded(newProject);
    handleClose();
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setStartDate('');
    setEndDate('');
    setSelectedPersonnel([]);
    onOpenChange(false);
  };

  const togglePersonnel = (personnelId: string) => {
    setSelectedPersonnel((prev) =>
      prev.includes(personnelId)
        ? prev.filter((id) => id !== personnelId)
        : [...prev, personnelId]
    );
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New Project</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Project Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter project name"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date *</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Scope of Work *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the project scope and objectives..."
              rows={3}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Assign Personnel</Label>
            <ScrollArea className="h-48 border rounded-md p-2">
              {personnel.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No personnel available
                </p>
              ) : (
                <div className="space-y-2">
                  {personnel.map((person) => (
                    <div
                      key={person.id}
                      className="flex items-center gap-3 p-2 rounded-md hover:bg-muted cursor-pointer"
                      onClick={() => togglePersonnel(person.id)}
                    >
                      <Checkbox
                        checked={selectedPersonnel.includes(person.id)}
                        onCheckedChange={() => togglePersonnel(person.id)}
                      />
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={person.avatarUrl} alt={person.name} />
                        <AvatarFallback className="text-xs">
                          {getInitials(person.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{person.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{person.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
            {selectedPersonnel.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {selectedPersonnel.length} personnel selected
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit">Create Project</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
