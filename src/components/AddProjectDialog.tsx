import { useState, useEffect, useRef } from 'react';
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
import { Mail, UserPlus, ShieldOff, Sparkles, Loader2, Users, ImagePlus, X, Search, Filter, CalendarIcon, Award, Building2, Tag, FolderOpen, ChevronRight } from 'lucide-react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { useWorkerCategories } from '@/hooks/useWorkerCategories';
import { useDepartments } from '@/hooks/useDepartments';
import { useCertificateTypes } from '@/hooks/useCertificateTypes';
import { useCertificateCategories } from '@/hooks/useCertificateCategories';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Switch } from '@/components/ui/switch';
import { useSuggestPersonnel, PersonnelSuggestion } from '@/hooks/useSuggestPersonnel';
import { Skeleton } from '@/components/ui/skeleton';
import { PersonnelPreviewSheet } from '@/components/PersonnelPreviewSheet';
import { FreelancerFilters } from '@/components/FreelancerFilters';

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
  const [isPosted, setIsPosted] = useState(false);
  const [showFreelancersOnly, setShowFreelancersOnly] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilters, setRoleFilters] = useState<string[]>([]);
  const [locationFilters, setLocationFilters] = useState<string[]>([]);
  const [departmentFilters, setDepartmentFilters] = useState<string[]>([]);
  const [certificateFilters, setCertificateFilters] = useState<string[]>([]);
  const [certificateFilterMode, setCertificateFilterMode] = useState<'types' | 'categories' | 'issuers'>('types');
  const [availabilityDateRange, setAvailabilityDateRange] = useState<DateRange | undefined>();

  // Fetch filter options from DB (same as personnel pool)
  const { categories: workerCategories } = useWorkerCategories();
  const { departments: dbDepartments } = useDepartments();
  const { data: certificateTypes = [] } = useCertificateTypes();
  const { categories: certCategories } = useCertificateCategories();
  

  // AI Suggestions state
  const [aiPrompt, setAiPrompt] = useState('');
  const [includeFreelancers, setIncludeFreelancers] = useState(false);
  const { loading: aiLoading, suggestions, getSuggestions, clearSuggestions, getSuggestionForPersonnel } = useSuggestPersonnel();

  // Personnel preview state
  const [previewPersonnel, setPreviewPersonnel] = useState<Personnel | null>(null);

  const { sendBulkInvitations } = useProjectInvitations();

  // Apply suggested fields when suggestions change
  useEffect(() => {
    if (suggestions?.suggestedFields) {
      const fields = suggestions.suggestedFields;
      if (fields.location && !location) setLocation(fields.location);
      if (fields.workCategory && !workCategory) setWorkCategory(fields.workCategory);
      if (fields.startDate && !startDate) setStartDate(fields.startDate);
      if (fields.endDate && !endDate) setEndDate(fields.endDate);
      if (fields.projectManager && !projectManager) setProjectManager(fields.projectManager);
    }
  }, [suggestions]);

  const handleGetSuggestions = async () => {
    if (!aiPrompt.trim()) {
      toast.error('Please enter project requirements first');
      return;
    }
    await getSuggestions(aiPrompt, personnel, includeFreelancers);
  };

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
      assignedPersonnel: assignedPersonnelIds,
      customer: customer.trim() || undefined,
      workCategory: workCategory.trim() || undefined,
      projectNumber: projectNumber.trim() || undefined,
      location: location.trim() || undefined,
      projectManager: projectManager.trim() || undefined,
      isPosted,
      imageUrl: imageUrl || undefined,
    };

    const createdProject = await onProjectAdded(newProject);

    // Send invitations to personnel marked for invitation
    if (createdProject && invitedPersonnelIds.length > 0) {
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
    setAiPrompt('');
    setIncludeFreelancers(false);
    setIsPosted(false);
    setShowFreelancersOnly(false);
    setImageUrl('');
    setSearchQuery('');
    setRoleFilters([]);
    setLocationFilters([]);
    setDepartmentFilters([]);
    setCertificateFilters([]);
    setCertificateFilterMode('types');
    setAvailabilityDateRange(undefined);
    setUploading(false);
    clearSuggestions();
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
    setPersonnelSelections((prev) =>
      prev.map(s => ({ ...s, mode }))
    );
  };

  const selectAllPersonnel = () => {
    // Use the same filtering logic as the displayed list
    const selectable = getFilteredPersonnel();
    setPersonnelSelections(selectable.map(p => ({ id: p.id, mode: globalMode })));
  };

  const deselectAllPersonnel = () => {
    setPersonnelSelections([]);
  };

  // Check if all selectable personnel are currently selected
  const allSelected = () => {
    const selectable = getFilteredPersonnel();
    if (selectable.length === 0) return false;
    return selectable.every(p => personnelSelections.some(s => s.id === p.id));
  };

  const selectSuggestedPersonnel = () => {
    if (!suggestions?.suggestedPersonnel) return;
    const suggestedIds = suggestions.suggestedPersonnel.map(s => s.id);
    const selectableIds = personnel
      .filter(p => suggestedIds.includes(p.id) && (p.category !== 'freelancer' || p.activated))
      .map(p => p.id);
    setPersonnelSelections(selectableIds.map(id => ({ id, mode: globalMode })));
  };

  // Sort personnel: suggested first (by score), then others
  const getSortedPersonnel = (personnelList: Personnel[]) => {
    if (!suggestions?.suggestedPersonnel || suggestions.suggestedPersonnel.length === 0) {
      return personnelList;
    }
    
    const suggestionMap = new Map(suggestions.suggestedPersonnel.map(s => [s.id, s]));
    
    return [...personnelList].sort((a, b) => {
      const suggA = suggestionMap.get(a.id);
      const suggB = suggestionMap.get(b.id);
      
      if (suggA && suggB) {
        return suggB.matchScore - suggA.matchScore;
      }
      if (suggA) return -1;
      if (suggB) return 1;
      return 0;
    });
  };

  // Filter personnel based on freelancer toggles, search, and filters
  const getFilteredPersonnel = () => {
    let filtered = personnel;
    
    // Freelancer filtering
    if (showFreelancersOnly) {
      filtered = filtered.filter(p => p.category === 'freelancer' && p.activated);
    } else if (includeFreelancers) {
      filtered = filtered.filter(p => p.category !== 'freelancer' || p.activated);
    } else {
      filtered = filtered.filter(p => p.category !== 'freelancer');
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.role.toLowerCase().includes(q) ||
        p.location?.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q)
      );
    }

    // Role filter (uses worker categories)
    if (roleFilters.length > 0) {
      filtered = filtered.filter(p => roleFilters.includes(p.category || ''));
    }

    // Location filter
    if (locationFilters.length > 0) {
      filtered = filtered.filter(p => locationFilters.includes(p.location || ''));
    }

    // Department filter
    if (departmentFilters.length > 0) {
      filtered = filtered.filter(p => departmentFilters.includes(p.department || ''));
    }

    // Certificate filter - personnel must have ALL selected certificates
    if (certificateFilters.length > 0) {
      filtered = filtered.filter(p => {
        return certificateFilters.every(filterVal => {
          if (certificateFilterMode === 'types') {
            return p.certificates.some(c => c.name === filterVal);
          } else if (certificateFilterMode === 'categories') {
            return p.certificates.some(c => c.category === filterVal);
          } else {
            return p.certificates.some(c => c.issuingAuthority === filterVal);
          }
        });
      });
    }

    return filtered;
  };

  // Derive unique values for filter options
  const uniqueLocations = [...new Set(personnel.map(p => p.location).filter(Boolean))] as string[];
  const uniqueCertNames = [...new Set(certificateTypes.map(t => t.name))];
  const uniqueCertCategories = [...new Set(certCategories.map(c => c.name))];
  const uniqueIssuers = [...new Set(personnel.flatMap(p => p.certificates.map(c => c.issuingAuthority).filter(Boolean)))].sort() as string[];
  const certificateListItems = certificateFilterMode === 'categories' ? uniqueCertCategories : certificateFilterMode === 'issuers' ? uniqueIssuers : uniqueCertNames;
  const activeFilterCount = roleFilters.length + locationFilters.length + departmentFilters.length + certificateFilters.length + (availabilityDateRange?.from ? 1 : 0);

  const selectablePersonnel = getSortedPersonnel(getFilteredPersonnel());
  const nonSelectablePersonnel = includeFreelancers 
    ? personnel.filter(p => p.category === 'freelancer' && !p.activated)
    : [];

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

  const getCategoryLabel = (person: Personnel) => {
    // Freelancers get a distinct tag
    if (person.category === 'freelancer') {
      return { label: 'Freelancer', className: 'bg-violet-100 text-violet-700 border-violet-200' };
    }
    
    const category = person.category;
    if (!category) return null;
    const lowerCategory = category.toLowerCase();
    if (lowerCategory.includes('fixed') || lowerCategory.includes('employee')) {
      return { label: 'Employee', variant: 'default' as const };
    }
    if (lowerCategory.includes('freelance') || lowerCategory.includes('contractor')) {
      return { label: 'Freelancer', variant: 'secondary' as const };
    }
    return { label: category, variant: 'outline' as const };
  };

  const getMatchScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-500/10 text-green-600 border-green-500/30';
    if (score >= 60) return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30';
    return 'bg-orange-500/10 text-orange-600 border-orange-500/30';
  };

  const inviteCount = personnelSelections.filter(s => s.mode === 'invite').length;
  const assignCount = personnelSelections.filter(s => s.mode === 'assign').length;
  const suggestedCount = suggestions?.suggestedPersonnel?.length || 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>New Project</DialogTitle>
          <DialogDescription>
            Describe your project requirements and get AI-powered personnel suggestions, or manually select team members.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row gap-6 overflow-hidden max-h-[calc(90vh-120px)]">
          {/* Left Column - AI Prompt + Project Details */}
          <div className="flex-1 space-y-4 overflow-y-auto pr-2 min-h-0">
            {/* AI Prompt Section */}
            <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <Label className="font-medium">AI Personnel Suggestions</Label>
              </div>
              <Textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Describe your project requirements...&#10;e.g., 'Need 3 divers for offshore work in Stavanger, must have valid G4 certificate and be available 15-20 February'"
                rows={3}
                className="resize-y min-h-[80px]"
              />
              <div className="flex items-center justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleGetSuggestions}
                  disabled={aiLoading || !aiPrompt.trim()}
                  className="gap-2"
                >
                  {aiLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Get Suggestions
                    </>
                  )}
                </Button>
              </div>
            </div>

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
                      onClick={() => setImageUrl('')}
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
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (!file.type.startsWith('image/')) {
                      toast.error('Please upload an image file');
                      return;
                    }
                    try {
                      setUploading(true);
                      const ext = file.name.split('.').pop();
                      const tempId = crypto.randomUUID();
                      const filePath = `${tempId}/project-image.${ext}`;
                      const { error: uploadError } = await supabase.storage
                        .from('project-documents')
                        .upload(filePath, file, { upsert: true });
                      if (uploadError) throw uploadError;
                      const { data: signedData } = await supabase.storage
                        .from('project-documents')
                        .createSignedUrl(filePath, 60 * 60 * 24 * 365);
                      setImageUrl(signedData?.signedUrl || filePath);
                      toast.success('Image uploaded');
                    } catch (error) {
                      console.error('Upload error:', error);
                      toast.error('Failed to upload image');
                    } finally {
                      setUploading(false);
                    }
                  }}
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

            {/* Project Details */}
            <div className="space-y-4">
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
                  <Label htmlFor="workCategory" className="flex items-center gap-1">
                    Work Category
                    {suggestions?.suggestedFields?.workCategory && !workCategory && (
                      <Badge variant="outline" className="text-[10px] ml-1 text-primary">AI</Badge>
                    )}
                  </Label>
                  <Input
                    id="workCategory"
                    value={workCategory}
                    onChange={(e) => setWorkCategory(e.target.value)}
                    placeholder="e.g., Installation, Maintenance"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location" className="flex items-center gap-1">
                    Location
                    {suggestions?.suggestedFields?.location && !location && (
                      <Badge variant="outline" className="text-[10px] ml-1 text-primary">AI</Badge>
                    )}
                  </Label>
                  <Input
                    id="location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g., North Sea Platform A"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="projectManager" className="flex items-center gap-1">
                  Project Manager
                  {suggestions?.suggestedFields?.projectManager && !projectManager && (
                    <Badge variant="outline" className="text-[10px] ml-1 text-primary">AI</Badge>
                  )}
                </Label>
                <Input
                  id="projectManager"
                  value={projectManager}
                  onChange={(e) => setProjectManager(e.target.value)}
                  placeholder="Enter project manager name"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate" className="flex items-center gap-1">
                    Start Date *
                    {suggestions?.suggestedFields?.startDate && !startDate && (
                      <Badge variant="outline" className="text-[10px] ml-1 text-primary">AI</Badge>
                    )}
                  </Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate" className="flex items-center gap-1">
                    End Date
                    {suggestions?.suggestedFields?.endDate && !endDate && (
                      <Badge variant="outline" className="text-[10px] ml-1 text-primary">AI</Badge>
                    )}
                  </Label>
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

              {/* Post Project Toggle */}
              <div className="flex items-center gap-4 p-3 bg-[#C4B5FD]/10 rounded-lg border border-[#C4B5FD]/50">
                <div className="flex items-center gap-2">
                  <Switch
                    id="postProject"
                    checked={isPosted}
                    onCheckedChange={setIsPosted}
                  />
                  <Label htmlFor="postProject" className="text-sm cursor-pointer font-medium">
                    Post project?
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Posted projects notify workers within the system about available opportunities
                </p>
              </div>
            </div>
          </div>

          {/* Right Column - Personnel Selection */}
          <div className="flex-1 flex flex-col space-y-3 min-w-0 overflow-y-auto min-h-0">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Personnel
                {suggestedCount > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {suggestedCount} suggested
                  </Badge>
                )}
              </Label>
              <div className="flex items-center gap-2">
                {suggestedCount > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={selectSuggestedPersonnel}
                    className="text-xs h-7 gap-1"
                  >
                    <Sparkles className="h-3 w-3" />
                    Select Suggested
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={allSelected() ? deselectAllPersonnel : selectAllPersonnel}
                  className="text-xs h-7"
                >
                  {allSelected() ? 'Deselect All' : 'Select All'}
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between bg-primary/10 rounded-lg p-3">
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
              <p className="text-xs text-muted-foreground hidden sm:block">
                {globalMode === 'invite' ? 'Send invitations' : 'Direct assignment'}
              </p>
            </div>

            <FreelancerFilters
              includeFreelancers={includeFreelancers}
              onIncludeFreelancersChange={setIncludeFreelancers}
              showFreelancersOnly={showFreelancersOnly}
              onShowFreelancersOnlyChange={setShowFreelancersOnly}
            />

            {/* Search & Filter */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search personnel..."
                  className="h-8 pl-8 text-sm"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 shrink-0">
                    <Filter className="h-3.5 w-3.5" />
                    Filters
                    {activeFilterCount > 0 && (
                      <Badge variant="secondary" className="h-4 min-w-4 px-1 text-[10px]">
                        {activeFilterCount}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0 max-h-[70vh] overflow-y-auto" align="end">
                  <div className="p-3 space-y-4">
                    {/* Availability Date Range */}
                    <Collapsible defaultOpen={false}>
                      <CollapsibleTrigger className="flex items-center justify-between w-full py-1.5 px-2 rounded hover:bg-muted group">
                        <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                          <CalendarIcon className="h-3 w-3" />
                          Availability
                          {availabilityDateRange?.from && (
                            <Badge variant="secondary" className="h-4 min-w-4 px-1 text-[10px] ml-1">1</Badge>
                          )}
                        </span>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pt-1">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button type="button" variant="outline" size="sm" className="w-full justify-start text-left font-normal h-8">
                              <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                              <span className="truncate text-xs">
                                {availabilityDateRange?.from
                                  ? availabilityDateRange.to
                                    ? `${format(availabilityDateRange.from, 'MMM d')} - ${format(availabilityDateRange.to, 'MMM d, yyyy')}`
                                    : format(availabilityDateRange.from, 'MMM d, yyyy')
                                  : 'Select dates'}
                              </span>
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              initialFocus
                              mode="range"
                              defaultMonth={availabilityDateRange?.from}
                              selected={availabilityDateRange}
                              onSelect={setAvailabilityDateRange}
                              numberOfMonths={2}
                            />
                            {availabilityDateRange?.from && (
                              <div className="p-2 border-t">
                                <Button type="button" variant="ghost" size="sm" className="w-full" onClick={() => setAvailabilityDateRange(undefined)}>
                                  Clear
                                </Button>
                              </div>
                            )}
                          </PopoverContent>
                        </Popover>
                      </CollapsibleContent>
                    </Collapsible>

                    {/* Job Role / Category filter */}
                    {workerCategories.length > 0 && (
                      <Collapsible defaultOpen={false}>
                        <CollapsibleTrigger className="flex items-center justify-between w-full py-1.5 px-2 rounded hover:bg-muted group">
                          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                            Job Role
                            {roleFilters.length > 0 && (
                              <Badge variant="secondary" className="h-4 min-w-4 px-1 text-[10px] ml-1">{roleFilters.length}</Badge>
                            )}
                          </span>
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
                        </CollapsibleTrigger>
                        <CollapsibleContent className="pt-1">
                          <div className="space-y-1 max-h-[120px] overflow-y-auto">
                            {workerCategories.map(cat => (
                              <label key={cat.id} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-muted cursor-pointer">
                                <Checkbox
                                  checked={roleFilters.includes(cat.name)}
                                  onCheckedChange={() => {
                                    setRoleFilters(prev => prev.includes(cat.name) ? prev.filter(r => r !== cat.name) : [...prev, cat.name]);
                                  }}
                                />
                                <span className="text-sm">{cat.name}</span>
                              </label>
                            ))}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    )}

                    {/* Location filter */}
                    {uniqueLocations.length > 0 && (
                      <Collapsible defaultOpen={false}>
                        <CollapsibleTrigger className="flex items-center justify-between w-full py-1.5 px-2 rounded hover:bg-muted group">
                          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                            Location
                            {locationFilters.length > 0 && (
                              <Badge variant="secondary" className="h-4 min-w-4 px-1 text-[10px] ml-1">{locationFilters.length}</Badge>
                            )}
                          </span>
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
                        </CollapsibleTrigger>
                        <CollapsibleContent className="pt-1">
                          <div className="space-y-1 max-h-[120px] overflow-y-auto">
                            {uniqueLocations.map(loc => (
                              <label key={loc} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-muted cursor-pointer">
                                <Checkbox
                                  checked={locationFilters.includes(loc)}
                                  onCheckedChange={() => {
                                    setLocationFilters(prev => prev.includes(loc) ? prev.filter(l => l !== loc) : [...prev, loc]);
                                  }}
                                />
                                <span className="text-sm truncate">{loc}</span>
                              </label>
                            ))}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    )}

                    {/* Certificate filter */}
                    <Collapsible defaultOpen={false}>
                      <CollapsibleTrigger className="flex items-center justify-between w-full py-1.5 px-2 rounded hover:bg-muted group">
                        <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                          <Award className="h-3 w-3" />
                          Certificates
                          {certificateFilters.length > 0 && (
                            <Badge variant="secondary" className="h-4 min-w-4 px-1 text-[10px] ml-1">{certificateFilters.length}</Badge>
                          )}
                        </span>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pt-1">
                        {(uniqueCertCategories.length > 0 || uniqueIssuers.length > 0) && (
                          <ToggleGroup
                            type="single"
                            value={certificateFilterMode}
                            onValueChange={(value) => {
                              if (value) {
                                setCertificateFilters([]);
                                setCertificateFilterMode(value as 'types' | 'categories' | 'issuers');
                              }
                            }}
                            className="w-full"
                          >
                            <ToggleGroupItem value="types" className="flex-1 gap-1 text-xs" aria-label="Filter by types">
                              <Tag className="h-3 w-3" />
                              Types
                            </ToggleGroupItem>
                            <ToggleGroupItem value="categories" className="flex-1 gap-1 text-xs" aria-label="Filter by categories">
                              <FolderOpen className="h-3 w-3" />
                              Categories
                            </ToggleGroupItem>
                            <ToggleGroupItem value="issuers" className="flex-1 gap-1 text-xs" aria-label="Filter by issuers">
                              <Building2 className="h-3 w-3" />
                              Issuers
                            </ToggleGroupItem>
                          </ToggleGroup>
                        )}
                        <div className="space-y-1 max-h-[120px] overflow-y-auto">
                          {certificateListItems.map(item => (
                            <label key={item} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-muted cursor-pointer">
                              <Checkbox
                                checked={certificateFilters.includes(item)}
                                onCheckedChange={() => {
                                  setCertificateFilters(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
                                }}
                              />
                              <span className="text-sm truncate">{item}</span>
                            </label>
                          ))}
                          {certificateListItems.length === 0 && (
                            <p className="text-xs text-muted-foreground px-2 py-1">
                              No {certificateFilterMode === 'categories' ? 'categories' : certificateFilterMode === 'issuers' ? 'issuers' : 'certificate types'}
                            </p>
                          )}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>

                    {/* Department filter */}
                    {dbDepartments.length > 0 && (
                      <Collapsible defaultOpen={false}>
                        <CollapsibleTrigger className="flex items-center justify-between w-full py-1.5 px-2 rounded hover:bg-muted group">
                          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            Department
                            {departmentFilters.length > 0 && (
                              <Badge variant="secondary" className="h-4 min-w-4 px-1 text-[10px] ml-1">{departmentFilters.length}</Badge>
                            )}
                          </span>
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
                        </CollapsibleTrigger>
                        <CollapsibleContent className="pt-1">
                          <div className="space-y-1 max-h-[120px] overflow-y-auto">
                            {dbDepartments.map(dept => (
                              <label key={dept.id} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-muted cursor-pointer">
                                <Checkbox
                                  checked={departmentFilters.includes(dept.name)}
                                  onCheckedChange={() => {
                                    setDepartmentFilters(prev => prev.includes(dept.name) ? prev.filter(d => d !== dept.name) : [...prev, dept.name]);
                                  }}
                                />
                                <span className="text-sm">{dept.name}</span>
                              </label>
                            ))}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    )}

                    {/* Clear all */}
                    {activeFilterCount > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          setRoleFilters([]);
                          setLocationFilters([]);
                          setDepartmentFilters([]);
                          setCertificateFilters([]);
                          setAvailabilityDateRange(undefined);
                        }}
                      >
                        <X className="h-3.5 w-3.5 mr-1" />
                        Clear all filters
                      </Button>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <ScrollArea className="flex-1 border rounded-md p-2 min-h-[300px]">
              {aiLoading ? (
                <div className="space-y-2 p-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center gap-3 p-2">
                      <Skeleton className="h-4 w-4 rounded" />
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div className="flex-1 space-y-1">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : selectablePersonnel.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {includeFreelancers
                    ? 'No personnel available for project assignment.'
                    : 'No personnel available. Toggle "Include freelancers" to see more options.'}
                </p>
              ) : (
                <div className="space-y-1">
                  {selectablePersonnel.map((person) => {
                    const selected = isSelected(person.id);
                    const mode = getPersonnelMode(person.id);
                    const categoryInfo = getCategoryLabel(person);
                    const suggestion = getSuggestionForPersonnel(person.id);
                    
                    return (
                      <div
                        key={person.id}
                        className={`flex items-center gap-3 p-2 rounded-md hover:bg-muted transition-colors cursor-pointer ${selected ? 'bg-muted/50' : ''} ${suggestion ? 'ring-1 ring-primary/20' : ''}`}
                        onClick={() => setPreviewPersonnel(person)}
                      >
                        <Checkbox
                          checked={selected}
                          onCheckedChange={() => togglePersonnel(person.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={person.avatarUrl} alt={person.name} />
                          <AvatarFallback className="text-xs">
                            {getInitials(person.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium truncate">
                              {person.name}
                            </span>
                            {categoryInfo && (
                              <Badge 
                                variant={'className' in categoryInfo ? 'outline' : categoryInfo.variant} 
                                className={`text-[10px] px-1.5 py-0 ${'className' in categoryInfo ? categoryInfo.className : ''}`}
                              >
                                {categoryInfo.label}
                              </Badge>
                            )}
                            {suggestion && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge 
                                    variant="outline" 
                                    className={`text-[10px] px-1.5 py-0 ${getMatchScoreColor(suggestion.matchScore)}`}
                                  >
                                    {suggestion.matchScore}% match
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs">
                                  <p className="font-medium mb-1">Match reasons:</p>
                                  <ul className="text-xs list-disc list-inside space-y-0.5">
                                    {suggestion.matchReasons.map((reason, idx) => (
                                      <li key={idx}>{reason}</li>
                                    ))}
                                  </ul>
                                </TooltipContent>
                              </Tooltip>
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
                            className="h-7 text-xs gap-1 flex-shrink-0"
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
                  
                  {/* Non-selectable personnel - inactive freelancers */}
                  {nonSelectablePersonnel.length > 0 && (
                    <>
                      <div className="border-t my-2 pt-2">
                        <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                          <ShieldOff className="h-3 w-3" />
                          Not activated ({nonSelectablePersonnel.length})
                        </p>
                      </div>
                      {nonSelectablePersonnel.map((person) => {
                        const categoryInfo = getCategoryLabel(person);
                        
                        return (
                          <Tooltip key={person.id}>
                            <TooltipTrigger asChild>
                              <div
                                className="flex items-center gap-3 p-2 rounded-md opacity-50 cursor-not-allowed"
                              >
                                <Checkbox disabled checked={false} />
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={person.avatarUrl} alt={person.name} />
                                  <AvatarFallback className="text-xs">
                                    {getInitials(person.name)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setPreviewPersonnel(person);
                                      }}
                                      className="text-sm font-medium truncate hover:underline hover:text-primary transition-colors text-left"
                                    >
                                      {person.name}
                                    </button>
                                    {categoryInfo && (
                                      <Badge 
                                        variant={'className' in categoryInfo ? 'outline' : categoryInfo.variant} 
                                        className={`text-[10px] px-1.5 py-0 ${'className' in categoryInfo ? categoryInfo.className : ''}`}
                                      >
                                        {categoryInfo.label}
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground truncate">{person.role}</p>
                                </div>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Activate this profile to assign to projects</p>
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </>
                  )}
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

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Project'}
              </Button>
            </div>
          </div>
        </form>

        <PersonnelPreviewSheet
          open={!!previewPersonnel}
          onOpenChange={(open) => !open && setPreviewPersonnel(null)}
          personnel={previewPersonnel}
        />
      </DialogContent>
    </Dialog>
  );
}
