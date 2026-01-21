import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Personnel } from '@/types';
import { Project } from '@/hooks/useProjects';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useProjectInvitations } from '@/hooks/useProjectInvitations';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Mail, UserPlus } from 'lucide-react';

interface AddProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  personnel: Personnel[];
  onProjectAdded: (project: Omit<Project, 'id' | 'calendarItems'>) => Promise<Project | null>;
}

type PersonnelMode = 'invite' | 'assign';

interface PersonnelSelection {
  id: string;
  mode: PersonnelMode;
}

export function AddProjectDialog({ open, onOpenChange, personnel, onProjectAdded }: AddProjectDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [personnelSelections, setPersonnelSelections] = useState<PersonnelSelection[]>([]);
  const [customer, setCustomer] = useState('');
  const [workCategory, setWorkCategory] = useState('');
  const [projectNumber, setProjectNumber] = useState('');
  const [location, setLocation] = useState('');
  const [projectManager, setProjectManager] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [globalMode, setGlobalMode] = useState<PersonnelMode>('invite');

  const { sendBulkInvitations } = useProjectInvitations();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsSubmitting(true);

    // Separate personnel by mode
    const assignedPersonnelIds = personnelSelections
      .filter(s => s.mode === 'assign')
      .map(s => s.id);
    const invitedPersonnelIds = personnelSelections
      .filter(s => s.mode === 'invite')
      .map(s => s.id);

    const newProject: Omit<Project, 'id' | 'calendarItems'> = {
      name,
      description,
      startDate,
      endDate: endDate || undefined,
      status: 'active',
      assignedPersonnel: assignedPersonnelIds, // Directly assign these personnel
      customer: customer.trim() || undefined,
      workCategory: workCategory.trim() || undefined,
      projectNumber: projectNumber.trim() || undefined,
      location: location.trim() || undefined,
      projectManager: projectManager.trim() || undefined,
    };

    const createdProject = await onProjectAdded(newProject);

    // Send invitations to personnel marked for invitation
    if (createdProject && invitedPersonnelIds.length > 0) {
      // Get personnel data for email sending
      const invitedPersonnelData = invitedPersonnelIds.map(id => {
        const person = personnel.find(p => p.id === id);
        return {
          id,
          email: person?.email || '',
          name: person?.name || '',
        };
      }).filter(p => p.email);

      const projectDetails = {
        name: createdProject.name,
        description: createdProject.description,
        startDate: createdProject.startDate,
        endDate: createdProject.endDate,
        location: createdProject.location,
        projectManager: createdProject.projectManager,
      };

      const result = await sendBulkInvitations(
        createdProject.id, 
        invitedPersonnelIds,
        invitedPersonnelData,
        projectDetails
      );
      if (result.success > 0) {
        toast.success(`Sent ${result.success} project invitation${result.success > 1 ? 's' : ''}`);
      }
      if (result.failed > 0) {
        toast.error(`Failed to send ${result.failed} invitation${result.failed > 1 ? 's' : ''}`);
      }
    }

    // Show success message for direct assignments
    if (assignedPersonnelIds.length > 0) {
      toast.success(`Assigned ${assignedPersonnelIds.length} personnel directly to the project`);
    }

    setIsSubmitting(false);
    resetForm();
    onOpenChange(false);
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setStartDate('');
    setEndDate('');
    setPersonnelSelections([]);
    setCustomer('');
    setWorkCategory('');
    setProjectNumber('');
    setLocation('');
    setProjectManager('');
    setGlobalMode('invite');
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      resetForm();
    }
    onOpenChange(isOpen);
  };

  const togglePersonnel = (personnelId: string) => {
    setPersonnelSelections((prev) => {
      const existing = prev.find(s => s.id === personnelId);
      if (existing) {
        return prev.filter(s => s.id !== personnelId);
      }
      return [...prev, { id: personnelId, mode: globalMode }];
    });
  };

  const togglePersonnelMode = (personnelId: string) => {
    setPersonnelSelections((prev) => {
      return prev.map(s => {
        if (s.id === personnelId) {
          return { ...s, mode: s.mode === 'invite' ? 'assign' : 'invite' };
        }
        return s;
      });
    });
  };

  const handleGlobalModeChange = (mode: PersonnelMode) => {
    setGlobalMode(mode);
    // Update all currently selected personnel to the new mode
    setPersonnelSelections((prev) =>
      prev.map(s => ({ ...s, mode }))
    );
  };

  const selectAllPersonnel = () => {
    setPersonnelSelections(personnel.map(p => ({ id: p.id, mode: globalMode })));
  };

  const deselectAllPersonnel = () => {
    setPersonnelSelections([]);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const isSelected = (personnelId: string) => {
    return personnelSelections.some(s => s.id === personnelId);
  };

  const getPersonnelMode = (personnelId: string): PersonnelMode => {
    const selection = personnelSelections.find(s => s.id === personnelId);
    return selection?.mode || globalMode;
  };

  const getCategoryLabel = (category: string | undefined) => {
    if (!category) return null;
    const lowerCategory = category.toLowerCase();
    if (lowerCategory.includes('fixed') || lowerCategory.includes('employee')) {
      return { label: 'Fixed Employee', variant: 'default' as const };
    }
    if (lowerCategory.includes('freelance') || lowerCategory.includes('contractor')) {
      return { label: 'Freelancer', variant: 'secondary' as const };
    }
    return { label: category, variant: 'outline' as const };
  };

  const inviteCount = personnelSelections.filter(s => s.mode === 'invite').length;
  const assignCount = personnelSelections.filter(s => s.mode === 'assign').length;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New Project</DialogTitle>
          <DialogDescription>
            Create a new project and invite or assign personnel. Choose to send invitations or directly assign team members.
          </DialogDescription>
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
              <Label htmlFor="projectNumber">Project Number</Label>
              <Input
                id="projectNumber"
                value={projectNumber}
                onChange={(e) => setProjectNumber(e.target.value)}
                placeholder="e.g., PRJ-2025-001"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer">Customer</Label>
              <Input
                id="customer"
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                placeholder="Enter customer name"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="workCategory">Work Category</Label>
              <Input
                id="workCategory"
                value={workCategory}
                onChange={(e) => setWorkCategory(e.target.value)}
                placeholder="e.g., Installation, Maintenance"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., North Sea Platform A"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="projectManager">Project Manager</Label>
            <Input
              id="projectManager"
              value={projectManager}
              onChange={(e) => setProjectManager(e.target.value)}
              placeholder="Enter project manager name"
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

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Personnel</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={selectAllPersonnel}
                  className="text-xs h-7"
                >
                  Select All
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={deselectAllPersonnel}
                  className="text-xs h-7"
                >
                  Clear
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Mode:</span>
                <ToggleGroup
                  type="single"
                  value={globalMode}
                  onValueChange={(value) => value && handleGlobalModeChange(value as PersonnelMode)}
                  className="gap-1"
                >
                  <ToggleGroupItem value="invite" size="sm" className="gap-1.5 px-3">
                    <Mail className="h-3.5 w-3.5" />
                    Invite
                  </ToggleGroupItem>
                  <ToggleGroupItem value="assign" size="sm" className="gap-1.5 px-3">
                    <UserPlus className="h-3.5 w-3.5" />
                    Assign
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
              <p className="text-xs text-muted-foreground">
                {globalMode === 'invite' ? 'Personnel will receive invitations' : 'Personnel will be directly assigned'}
              </p>
            </div>
            <p className="text-xs text-muted-foreground italic">
              Tip: Click the Invite/Assign button on each selected person to toggle their mode individually.
            </p>

            <ScrollArea className="h-48 border rounded-md p-2">
              {personnel.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No personnel available
                </p>
              ) : (
                <div className="space-y-2">
                  {personnel.map((person) => {
                    const selected = isSelected(person.id);
                    const mode = getPersonnelMode(person.id);
                    const categoryInfo = getCategoryLabel(person.category);
                    
                    return (
                      <div
                        key={person.id}
                        className={`flex items-center gap-3 p-2 rounded-md hover:bg-muted ${selected ? 'bg-muted/50' : ''}`}
                      >
                        <Checkbox
                          checked={selected}
                          onCheckedChange={() => togglePersonnel(person.id)}
                        />
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={person.avatarUrl} alt={person.name} />
                          <AvatarFallback className="text-xs">
                            {getInitials(person.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate">{person.name}</p>
                            {categoryInfo && (
                              <Badge variant={categoryInfo.variant} className="text-[10px] px-1.5 py-0">
                                {categoryInfo.label}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{person.role}</p>
                        </div>
                        {selected && (
                          <Button
                            type="button"
                            variant={mode === 'invite' ? 'outline' : 'secondary'}
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePersonnelMode(person.id);
                            }}
                            className="h-7 text-xs gap-1"
                          >
                            {mode === 'invite' ? (
                              <>
                                <Mail className="h-3 w-3" />
                                Invite
                              </>
                            ) : (
                              <>
                                <UserPlus className="h-3 w-3" />
                                Assign
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
            {personnelSelections.length > 0 && (
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                {inviteCount > 0 && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {inviteCount} invitation{inviteCount > 1 ? 's' : ''}
                  </span>
                )}
                {assignCount > 0 && (
                  <span className="flex items-center gap-1">
                    <UserPlus className="h-3 w-3" />
                    {assignCount} direct assignment{assignCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="active" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Project'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
