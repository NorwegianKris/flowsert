import { useState, useEffect, useRef } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GeoLocationInput } from '@/components/ui/geo-location-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Project } from '@/hooks/useProjects';
import { Personnel } from '@/types';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ImagePlus, X, Loader2, Lock } from 'lucide-react';
import { ProjectVisibilityControls } from '@/components/ProjectVisibilityControls';

interface EditProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
  personnel: Personnel[];
  onSave: (project: Project) => void;
}

export function EditProjectDialog({ open, onOpenChange, project, personnel, onSave }: EditProjectDialogProps) {
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description);
  const [status, setStatus] = useState<'active' | 'completed' | 'pending'>(project.status);
  const [startDate, setStartDate] = useState(project.startDate);
  const [endDate, setEndDate] = useState(project.endDate || '');
  const [assignedPersonnel, setAssignedPersonnel] = useState<string[]>(project.assignedPersonnel);
  const [customer, setCustomer] = useState(project.customer || '');
  const [workCategory, setWorkCategory] = useState(project.workCategory || '');
  const [projectNumber, setProjectNumber] = useState(project.projectNumber || '');
  const [location, setLocation] = useState(project.location || '');
  const [projectManager, setProjectManager] = useState(project.projectManager || '');
  const [imageUrl, setImageUrl] = useState(project.imageUrl || '');
  const [isPosted, setIsPosted] = useState(project.isPosted || false);
  const [projectCountry, setProjectCountry] = useState(project.projectCountry || '');
  const [projectLocationLabel, setProjectLocationLabel] = useState(project.projectLocationLabel || '');
  const [visibilityMode, setVisibilityMode] = useState<'same_country' | 'all'>(project.visibilityMode || 'same_country');
  const [includeCountries, setIncludeCountries] = useState<string[]>(project.includeCountries || []);
  const [excludeCountries, setExcludeCountries] = useState<string[]>(project.excludeCountries || []);
  const [uploading, setUploading] = useState(false);
  const [personnelSearch, setPersonnelSearch] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName(project.name);
      setDescription(project.description);
      setStatus(project.status);
      setStartDate(project.startDate);
      setEndDate(project.endDate || '');
      setAssignedPersonnel(project.assignedPersonnel);
      setCustomer(project.customer || '');
      setWorkCategory(project.workCategory || '');
      setProjectNumber(project.projectNumber || '');
      setLocation(project.location || '');
      setProjectManager(project.projectManager || '');
      setImageUrl(project.imageUrl || '');
      setIsPosted(project.isPosted || false);
      setProjectCountry(project.projectCountry || '');
      setProjectLocationLabel(project.projectLocationLabel || '');
      setVisibilityMode(project.visibilityMode || 'same_country');
      setIncludeCountries(project.includeCountries || []);
      setExcludeCountries(project.excludeCountries || []);
    }
  }, [open, project]);

  const handlePersonnelToggle = (personnelId: string, checked: boolean) => {
    if (checked) {
      setAssignedPersonnel([...assignedPersonnel, personnelId]);
    } else {
      setAssignedPersonnel(assignedPersonnel.filter((id) => id !== personnelId));
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    try {
      setUploading(true);
      const ext = file.name.split('.').pop();
      const filePath = `${project.id}/project-image.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('project-documents')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      setImageUrl(filePath);
      toast.success('Image uploaded');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setImageUrl('');
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
    if (isPosted && !projectCountry.trim()) {
      toast.error('Please set a project location before posting');
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
      customer: customer.trim() || undefined,
      workCategory: workCategory.trim() || undefined,
      projectNumber: projectNumber.trim() || undefined,
      location: location.trim() || undefined,
      projectManager: projectManager.trim() || undefined,
      imageUrl: imageUrl || undefined,
      isPosted,
      projectCountry: projectCountry.toLowerCase().trim() || undefined,
      projectLocationLabel: projectLocationLabel || undefined,
      visibilityMode,
      includeCountries: includeCountries.length > 0 ? includeCountries : undefined,
      excludeCountries: excludeCountries.length > 0 ? excludeCountries : undefined,
      // Preserve rotation/shift fields from original project
      isRecurring: project.isRecurring,
      rotationOnDays: project.rotationOnDays,
      rotationOffDays: project.rotationOffDays,
      rotationCount: project.rotationCount,
      rotationsCompleted: project.rotationsCompleted,
      autoCloseEnabled: project.autoCloseEnabled,
      nextCloseDate: project.nextCloseDate,
      nextOpenDate: project.nextOpenDate,
      isShiftParent: project.isShiftParent,
      shiftGroupId: project.shiftGroupId,
      shiftNumber: project.shiftNumber,
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
          {/* Project Image Upload */}
          <div className="space-y-2">
            <Label>Project Image</Label>
            <div className="flex items-center gap-4">
              {imageUrl ? (
                <div className="relative">
                  <img
                    src={imageUrl}
                    alt="Project"
                    className="h-20 w-20 rounded-xl object-cover border border-border"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="h-20 w-20 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                >
                  {uploading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <>
                      <ImagePlus className="h-6 w-6" />
                      <span className="text-[10px]">Upload</span>
                    </>
                  )}
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
              {imageUrl && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                  Change
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Project Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter project name"
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
              <GeoLocationInput
                id="location"
                value={location}
                onChange={setLocation}
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
              <Label htmlFor="endDate" className="flex items-center gap-1.5">
                End Date
                {project.isRecurring && project.rotationOnDays && (
                  <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                disabled={!!(project.isRecurring && project.rotationOnDays)}
                className={project.isRecurring && project.rotationOnDays ? "bg-muted cursor-not-allowed" : ""}
              />
              {project.isRecurring && project.rotationOnDays && (
                <p className="text-xs text-muted-foreground">Auto-calculated from rotation schedule</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Assigned Personnel</Label>
            <Input
              placeholder="Search personnel..."
              value={personnelSearch}
              onChange={(e) => setPersonnelSearch(e.target.value)}
              className="mb-2"
            />
            <div className="border rounded-md p-3 max-h-[200px] overflow-y-auto space-y-2">
              {personnel.filter(p => 
                p.name.toLowerCase().includes(personnelSearch.toLowerCase()) || 
                p.role.toLowerCase().includes(personnelSearch.toLowerCase())
              ).length > 0 ? (
                personnel.filter(p => 
                  p.name.toLowerCase().includes(personnelSearch.toLowerCase()) || 
                  p.role.toLowerCase().includes(personnelSearch.toLowerCase())
                ).map((person) => (
                  <div key={person.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted/50">
                    <Checkbox
                      id={`person-${person.id}`}
                      checked={assignedPersonnel.includes(person.id)}
                      onCheckedChange={(checked) =>
                        handlePersonnelToggle(person.id, checked as boolean)
                      }
                    />
                    <label htmlFor={`person-${person.id}`} className="flex-1 cursor-pointer text-sm">
                      <span className="font-medium">{person.name}</span>
                      <span className="text-muted-foreground ml-2">({person.role})</span>
                    </label>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-2">No personnel available</p>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{assignedPersonnel.length} personnel selected</p>
          </div>

          {/* Posted Project Toggle + Visibility */}
          <div className="space-y-3">
            <div className="flex items-center gap-4 p-3 bg-[#C4B5FD]/10 rounded-lg border border-[#C4B5FD]/50">
              <div className="flex items-center gap-2">
                <Switch id="editPostProject" checked={isPosted} onCheckedChange={setIsPosted} />
                <Label htmlFor="editPostProject" className="text-sm cursor-pointer font-medium">Post project?</Label>
              </div>
              <p className="text-xs text-muted-foreground">Make visible to workers as an opportunity</p>
            </div>
            {isPosted && (
              <ProjectVisibilityControls
                projectCountry={projectCountry}
                projectLocationLabel={projectLocationLabel}
                visibilityMode={visibilityMode}
                includeCountries={includeCountries}
                excludeCountries={excludeCountries}
                onProjectLocationChange={(country, label) => {
                  setProjectCountry(country);
                  setProjectLocationLabel(label);
                }}
                onChange={(data) => {
                  setVisibilityMode(data.visibilityMode);
                  setIncludeCountries(data.includeCountries);
                  setExcludeCountries(data.excludeCountries);
                }}
              />
            )}
          </div>

          {/* Shift info (read-only) */}
          {project.shiftGroupId && (
            <div className="p-3 bg-teal-500/10 rounded-lg border border-teal-500/50">
              <div className="flex items-center gap-1.5 mb-1">
                <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-xs font-medium text-muted-foreground">Set at creation — cannot be changed</p>
              </div>
              <p className="text-sm font-medium text-foreground">
                Shift {project.shiftNumber} in a back-to-back group
              </p>
            </div>
          )}

          {/* Rotation info (read-only) */}
          {project.isRecurring && project.rotationOnDays && (
            <div className="p-3 bg-teal-500/10 rounded-lg border border-teal-500/50">
              <p className="text-sm font-medium text-foreground">
                Rotation: {project.rotationOnDays} days on / {project.rotationOffDays} days off
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {project.rotationsCompleted || 0} of {project.rotationCount || 1} rotations completed
                {project.autoCloseEnabled && ' · Auto-close enabled'}
              </p>
            </div>
          )}
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
