import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GeoLocationInput } from '@/components/ui/geo-location-input';
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Mail, UserPlus, ShieldOff, Sparkles, Loader2, Users, ImagePlus, X, Search, Filter, CalendarIcon, Award, Building2, Tag, FolderOpen, ChevronRight, ArrowUpDown, Briefcase, Globe, Repeat, Lock } from 'lucide-react';
import { ProjectVisibilityControls } from '@/components/ProjectVisibilityControls';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { useWorkerCategories } from '@/hooks/useWorkerCategories';
import { useDepartments } from '@/hooks/useDepartments';
import { useCertificateCategories } from '@/hooks/useCertificateCategories';
import { usePersonnelAvailability } from '@/hooks/usePersonnelAvailability';

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
  
  const [isPosted, setIsPosted] = useState(false);
  const [projectCountry, setProjectCountry] = useState('');
  const [projectLocationLabel, setProjectLocationLabel] = useState('');
  const [visibilityMode, setVisibilityMode] = useState<'same_country' | 'all'>('same_country');
  const [includeCountries, setIncludeCountries] = useState<string[]>([]);
  const [excludeCountries, setExcludeCountries] = useState<string[]>([]);
  const [projectPersonnelFilter, setProjectPersonnelFilter] = useState<'all' | 'employees' | 'freelancers' | 'custom'>('employees');
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringIntervalDays, setRecurringIntervalDays] = useState<number>(14);
  const [recurringIntervalLabel, setRecurringIntervalLabel] = useState('14 days');
  const [customInterval, setCustomInterval] = useState(false);
  // Rotation schedule
  const [rotationOnValue, setRotationOnValue] = useState(14);
  const [rotationOnUnit, setRotationOnUnit] = useState<'days' | 'weeks'>('days');
  const [rotationOffValue, setRotationOffValue] = useState(28);
  const [rotationOffUnit, setRotationOffUnit] = useState<'days' | 'weeks'>('days');
  const [rotationCount, setRotationCount] = useState(1);
  const [autoCloseEnabled, setAutoCloseEnabled] = useState(true);
  // Back-to-back shifts
  const [isBackToBack, setIsBackToBack] = useState(false);
  const [shiftCount, setShiftCount] = useState(2);
  const [shiftGroupColor, setShiftGroupColor] = useState('#94a3b8');
  // Per-shift personnel selections (used when isBackToBack is true)
  const [shiftPersonnelSelections, setShiftPersonnelSelections] = useState<Record<number, PersonnelSelection[]>>({});
  const [activeShiftTab, setActiveShiftTab] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilters, setRoleFilters] = useState<string[]>([]);
  const [locationFilters, setLocationFilters] = useState<string[]>([]);
  const [departmentFilters, setDepartmentFilters] = useState<string[]>([]);
  const [certificateFilters, setCertificateFilters] = useState<string[]>([]);
  const [certificateFilterMode, setCertificateFilterMode] = useState<'types' | 'categories' | 'issuers'>('categories');
  const [availabilityDateRange, setAvailabilityDateRange] = useState<DateRange | undefined>();

  // Fetch filter options from DB (same as personnel pool)
  const { categories: workerCategories } = useWorkerCategories();
  const { departments: dbDepartments } = useDepartments();
  const { categories: certCategories } = useCertificateCategories();

  // Availability hook
  const { isAvailable } = usePersonnelAvailability(availabilityDateRange?.from, availabilityDateRange?.to);

  // Sort state
  const [sortOption, setSortOption] = useState<'recent' | 'alphabetical'>('recent');

  // Pre-computed maps for category and issuer filtering (matching dashboard pattern)
  const personnelCertificateCategoriesMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    personnel.forEach(p => {
      const cats = new Set<string>();
      p.certificates.forEach(c => { if (c.category) cats.add(c.category); });
      map.set(p.id, cats);
    });
    return map;
  }, [personnel]);

  const personnelIssuersMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    personnel.forEach(p => {
      const issuers = new Set<string>();
      p.certificates.forEach(c => { if (c.issuingAuthority) issuers.add(c.issuingAuthority); });
      map.set(p.id, issuers);
    });
    return map;
  }, [personnel]);


  // AI Suggestions state
  const [aiPrompt, setAiPrompt] = useState('');
  
  const { loading: aiLoading, suggestions, getSuggestions, clearSuggestions, getSuggestionForPersonnel } = useSuggestPersonnel();

  // Personnel preview state
  const [previewPersonnel, setPreviewPersonnel] = useState<Personnel | null>(null);

  const { sendBulkInvitations } = useProjectInvitations();

  // Auto-calculate end date for recurring projects
  useEffect(() => {
    if (isRecurring && startDate) {
      const onDays = rotationOnValue * (rotationOnUnit === 'weeks' ? 7 : 1);
      const offDays = rotationOffValue * (rotationOffUnit === 'weeks' ? 7 : 1);
      const totalDays = (onDays + offDays) * rotationCount;
      const start = new Date(startDate);
      const end = new Date(start.getTime() + totalDays * 86400000);
      const yyyy = end.getFullYear();
      const mm = String(end.getMonth() + 1).padStart(2, '0');
      const dd = String(end.getDate()).padStart(2, '0');
      setEndDate(`${yyyy}-${mm}-${dd}`);
    }
  }, [isRecurring, startDate, rotationOnValue, rotationOnUnit, rotationOffValue, rotationOffUnit, rotationCount]);

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
    await getSuggestions(aiPrompt, personnel, projectPersonnelFilter !== 'employees', projectPersonnelFilter !== 'freelancers');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isPosted && !projectCountry.trim()) {
      toast.error('Please set a project location before posting');
      return;
    }
    
    setIsSubmitting(true);

    // Build per-shift personnel map for back-to-back shifts
    const isShiftMode = isRecurring && isBackToBack;
    let shift1Selections: PersonnelSelection[];
    let shiftPersonnelMap: Record<number, { assigned: string[]; invited: string[] }> | undefined;

    if (isShiftMode) {
      shift1Selections = shiftPersonnelSelections[1] || [];
      shiftPersonnelMap = {};
      for (let n = 1; n <= shiftCount; n++) {
        const sels = shiftPersonnelSelections[n] || [];
        shiftPersonnelMap[n] = {
          assigned: sels.filter(s => s.mode === 'assign').map(s => s.id),
          invited: sels.filter(s => s.mode === 'invite').map(s => s.id),
        };
      }
    } else {
      shift1Selections = personnelSelections;
    }

    // Separate personnel by mode (shift 1 or standard)
    const assignedPersonnelIds = shift1Selections
      .filter(s => s.mode === 'assign')
      .map(s => s.id);
    const invitedPersonnelIds = shift1Selections
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
      projectCountry: projectCountry.toLowerCase().trim() || undefined,
      projectLocationLabel: projectLocationLabel || undefined,
      visibilityMode,
      includeCountries: includeCountries.length > 0 ? includeCountries : undefined,
      excludeCountries: excludeCountries.length > 0 ? excludeCountries : undefined,
      isRecurring,
      recurringIntervalDays: isRecurring ? recurringIntervalDays : undefined,
      recurringIntervalLabel: isRecurring ? recurringIntervalLabel : undefined,
      recurringNextDate: isRecurring
        ? new Date(Date.now() + recurringIntervalDays * 86400000).toISOString()
        : undefined,
      // Rotation fields
      rotationOnDays: isRecurring ? rotationOnValue * (rotationOnUnit === 'weeks' ? 7 : 1) : undefined,
      rotationOffDays: isRecurring ? rotationOffValue * (rotationOffUnit === 'weeks' ? 7 : 1) : undefined,
      rotationCount: isRecurring ? rotationCount : undefined,
      rotationsCompleted: 0,
      autoCloseEnabled: isRecurring ? autoCloseEnabled : false,
      nextCloseDate: isRecurring && autoCloseEnabled && startDate
        ? new Date(new Date(startDate).getTime() + rotationOnValue * (rotationOnUnit === 'weeks' ? 7 : 1) * 86400000).toISOString()
        : undefined,
      nextOpenDate: isRecurring && autoCloseEnabled && startDate
        ? new Date(new Date(startDate).getTime() + (rotationOnValue * (rotationOnUnit === 'weeks' ? 7 : 1) + rotationOffValue * (rotationOffUnit === 'weeks' ? 7 : 1)) * 86400000).toISOString()
        : undefined,
      // Shift fields
      isShiftParent: isShiftMode ? true : false,
      shiftNumber: isShiftMode ? 1 : undefined,
      shiftGroupId: undefined, // Set by hook after insert
      groupColor: isShiftMode ? shiftGroupColor : undefined,
      _shiftCount: isShiftMode ? shiftCount : undefined,
      _shiftPersonnel: isShiftMode ? shiftPersonnelMap : undefined,
    } as any;

    const createdProject = await onProjectAdded(newProject);

    // Send invitations — for shift mode, iterate all shifts
    if (createdProject && isShiftMode && shiftPersonnelMap) {
      const createdShifts: { shiftNumber: number; projectId: string }[] =
        (createdProject as any)._createdShifts || [{ shiftNumber: 1, projectId: createdProject.id }];

      let totalSuccess = 0;
      let totalFailed = 0;

      for (const shift of createdShifts) {
        const shiftInvited = shiftPersonnelMap[shift.shiftNumber]?.invited || [];
        if (shiftInvited.length === 0) continue;

        const invitedData = shiftInvited.map(id => {
          const person = personnel.find(p => p.id === id);
          return { id, email: person?.email || '', name: person?.name || '' };
        }).filter(p => p.email);

        const projectDetails = {
          name: `${name} — Shift ${shift.shiftNumber}`,
          description: createdProject.description,
          startDate: createdProject.startDate,
          endDate: createdProject.endDate,
          location: createdProject.location,
          projectManager: createdProject.projectManager,
        };

        const result = await sendBulkInvitations(
          shift.projectId,
          shiftInvited,
          invitedData,
          projectDetails
        );
        totalSuccess += result.success;
        totalFailed += result.failed;
      }

      if (totalSuccess > 0) {
        toast.success(`Sent ${totalSuccess} project invitation${totalSuccess > 1 ? 's' : ''} across shifts`);
      }
      if (totalFailed > 0) {
        toast.error(`Failed to send ${totalFailed} invitation${totalFailed > 1 ? 's' : ''}`);
      }
    } else if (createdProject && invitedPersonnelIds.length > 0) {
      // Standard (non-shift) invitations
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
    setShiftPersonnelSelections({});
    setActiveShiftTab(1);
    setCustomer('');
    setWorkCategory('');
    setProjectNumber('');
    setLocation('');
    setProjectManager('');
    setAiPrompt('');
    setIsPosted(false);
    setProjectCountry('');
    setProjectLocationLabel('');
    setVisibilityMode('same_country');
    setIncludeCountries([]);
    setExcludeCountries([]);
    setProjectPersonnelFilter('employees');
    setImageUrl('');
    setSearchQuery('');
    setRoleFilters([]);
    setLocationFilters([]);
    setDepartmentFilters([]);
    setCertificateFilters([]);
    setCertificateFilterMode('types');
    setAvailabilityDateRange(undefined);
    setSortOption('recent');
    setUploading(false);
    setIsRecurring(false);
    setRecurringIntervalDays(14);
    setRecurringIntervalLabel('14 days');
    setCustomInterval(false);
    setRotationOnValue(14);
    setRotationOnUnit('days');
    setRotationOffValue(28);
    setRotationOffUnit('days');
    setRotationCount(1);
    setAutoCloseEnabled(true);
    setIsBackToBack(false);
    setShiftCount(2);
    clearSuggestions();
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      resetForm();
    }
    onOpenChange(isOpen);
  };

  // --- Per-shift personnel helpers ---
  // Get current selections based on mode
  const getCurrentSelections = useCallback((): PersonnelSelection[] => {
    if (isBackToBack) {
      return shiftPersonnelSelections[activeShiftTab] || [];
    }
    return personnelSelections;
  }, [isBackToBack, shiftPersonnelSelections, activeShiftTab, personnelSelections]);

  const setCurrentSelections = useCallback((updater: (prev: PersonnelSelection[]) => PersonnelSelection[]) => {
    if (isBackToBack) {
      setShiftPersonnelSelections(prev => ({
        ...prev,
        [activeShiftTab]: updater(prev[activeShiftTab] || []),
      }));
    } else {
      setPersonnelSelections(updater);
    }
  }, [isBackToBack, activeShiftTab]);

  const togglePersonnel = (personnelId: string) => {
    setCurrentSelections((prev) => {
      const existing = prev.find(s => s.id === personnelId);
      if (existing) {
        return prev.filter(s => s.id !== personnelId);
      }
      return [...prev, { id: personnelId, mode: 'invite' }];
    });
  };

  const setPersonnelMode = (personnelId: string, mode: PersonnelMode) => {
    setCurrentSelections((prev) => {
      const existing = prev.find(s => s.id === personnelId);
      if (existing) {
        return prev.map(s => s.id === personnelId ? { ...s, mode } : s);
      }
      return [...prev, { id: personnelId, mode }];
    });
  };

  const selectAllPersonnel = () => {
    const selectable = getFilteredPersonnel();
    setCurrentSelections(() => selectable.map(p => ({ id: p.id, mode: 'invite' })));
  };

  const deselectAllPersonnel = () => {
    setCurrentSelections(() => []);
  };

  // Check if all selectable personnel are currently selected
  const allSelected = () => {
    const selectable = getFilteredPersonnel();
    const current = getCurrentSelections();
    if (selectable.length === 0) return false;
    return selectable.every(p => current.some(s => s.id === p.id));
  };

  const selectSuggestedPersonnel = () => {
    if (!suggestions?.suggestedPersonnel) return;
    const suggestedIds = suggestions.suggestedPersonnel.map(s => s.id);
    const selectableIds = personnel
      .filter(p => suggestedIds.includes(p.id) && (p.category !== 'freelancer' || p.activated))
      .map(p => p.id);
    setCurrentSelections(() => selectableIds.map(id => ({ id, mode: 'invite' })));
  };

  // Sort personnel: suggested first (by score), then apply sort option
  const getSortedPersonnel = (personnelList: Personnel[]) => {
    let sorted = [...personnelList];

    // If AI suggestions exist, those take priority
    if (suggestions?.suggestedPersonnel && suggestions.suggestedPersonnel.length > 0) {
      const suggestionMap = new Map(suggestions.suggestedPersonnel.map(s => [s.id, s]));
      sorted.sort((a, b) => {
        const suggA = suggestionMap.get(a.id);
        const suggB = suggestionMap.get(b.id);
        if (suggA && suggB) return suggB.matchScore - suggA.matchScore;
        if (suggA) return -1;
        if (suggB) return 1;
        return 0;
      });
    } else {
      // Apply user sort option (matching dashboard)
      if (sortOption === 'alphabetical') {
        sorted.sort((a, b) => a.name.localeCompare(b.name));
      } else {
        // 'recent' - sort by updatedAt descending
        sorted.sort((a, b) => {
          const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
          const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
          return dateB - dateA;
        });
      }
    }

    return sorted;
  };

  // Filter personnel based on freelancer toggles, search, and filters
  const getFilteredPersonnel = () => {
    let filtered = personnel;
    
    // Personnel category filtering
    if (projectPersonnelFilter === 'employees') {
      filtered = filtered.filter(p => p.category !== 'freelancer');
    } else if (projectPersonnelFilter === 'freelancers') {
      filtered = filtered.filter(p => p.category === 'freelancer' && p.activated);
    } else {
      // 'all' — include both, but only activated freelancers
      filtered = filtered.filter(p => p.category !== 'freelancer' || p.activated);
    }

    // Search query (includes certificate names, matching dashboard)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.role.toLowerCase().includes(q) ||
        p.location?.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q) ||
        p.certificates.some(c => c.name.toLowerCase().includes(q))
      );
    }

    // Role filter (matches p.role like dashboard, not p.category)
    if (roleFilters.length > 0) {
      filtered = filtered.filter(p => roleFilters.includes(p.role));
    }

    // Location filter
    if (locationFilters.length > 0) {
      filtered = filtered.filter(p => locationFilters.includes(p.location || ''));
    }

    // Department filter
    if (departmentFilters.length > 0) {
      filtered = filtered.filter(p => departmentFilters.includes(p.department || ''));
    }

    // Certificate filter - personnel must have ALL selected certificates (using pre-computed maps)
    if (certificateFilters.length > 0) {
      filtered = filtered.filter(p => {
        return certificateFilters.every(filterVal => {
          if (certificateFilterMode === 'types') {
            return p.certificates.some(c => c.name === filterVal);
          } else if (certificateFilterMode === 'categories') {
            return personnelCertificateCategoriesMap.get(p.id)?.has(filterVal) ?? false;
          } else {
            return personnelIssuersMap.get(p.id)?.has(filterVal) ?? false;
          }
        });
      });
    }

    // Availability filter
    if (availabilityDateRange?.from) {
      filtered = filtered.filter(p => isAvailable(p.id));
    }

    return filtered;
  };

  // Derive unique values for filter options
  const uniqueLocations = [...new Set(personnel.map(p => p.location).filter(Boolean))] as string[];
  const uniqueCertNames = [...new Set(personnel.flatMap(p => p.certificates.map(c => c.name)).filter(Boolean))].sort();
  const uniqueCertCategories = [...new Set(certCategories.map(c => c.name))];
  const uniqueIssuers = [...new Set(personnel.flatMap(p => p.certificates.map(c => c.issuingAuthority).filter(Boolean)))].sort() as string[];
  const certificateListItems = certificateFilterMode === 'categories' ? uniqueCertCategories : certificateFilterMode === 'issuers' ? uniqueIssuers : uniqueCertNames;
  const activeFilterCount = roleFilters.length + locationFilters.length + departmentFilters.length + certificateFilters.length + (availabilityDateRange?.from ? 1 : 0);

  const selectablePersonnel = getSortedPersonnel(getFilteredPersonnel());
  const nonSelectablePersonnel = projectPersonnelFilter !== 'employees'
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
    return getCurrentSelections().some(s => s.id === personnelId);
  };

  const getPersonnelMode = (personnelId: string): PersonnelMode => {
    const selection = getCurrentSelections().find(s => s.id === personnelId);
    return selection?.mode || 'invite';
  };

  const getCategoryLabel = (person: Personnel) => {
    if (!person.category) return null;
    if (person.category === 'freelancer') {
      return { label: 'Freelancer', variant: 'secondary' as const };
    }
    return { label: 'Employee', variant: 'default' as const };
  };

  const getMatchScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-500/10 text-green-600 border-green-500/30';
    if (score >= 60) return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30';
    return 'bg-orange-500/10 text-orange-600 border-orange-500/30';
  };

  const currentSelections = getCurrentSelections();
  const inviteCount = currentSelections.filter(s => s.mode === 'invite').length;
  const assignCount = currentSelections.filter(s => s.mode === 'assign').length;
  const suggestedCount = suggestions?.suggestedPersonnel?.length || 0;

  // Total selections across all shifts (for summary)
  const totalShiftSelections = isBackToBack
    ? Object.values(shiftPersonnelSelections).reduce((sum, arr) => sum + arr.length, 0)
    : currentSelections.length;

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
                  variant="default"
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
                  <GeoLocationInput
                    id="location"
                    value={location}
                    onChange={setLocation}
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
                    {isRecurring ? (
                      <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground font-normal ml-1">
                        <Lock className="h-3 w-3" />
                        Auto
                      </span>
                    ) : (
                      suggestions?.suggestedFields?.endDate && !endDate && (
                        <Badge variant="outline" className="text-[10px] ml-1 text-primary">AI</Badge>
                      )
                    )}
                  </Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    readOnly={isRecurring}
                    className={isRecurring ? 'bg-muted cursor-not-allowed' : ''}
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

            {/* Recurring project */}
            <div className="flex items-start gap-3 pt-3 border-t border-border/40">
              <Switch
                checked={isRecurring}
                onCheckedChange={(val) => {
                  setIsRecurring(val);
                  if (!val) {
                    setIsBackToBack(false);
                    setAutoCloseEnabled(true);
                    setEndDate('');
                  }
                }}
                className="mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Repeat className="h-4 w-4 text-teal-500" />
                  <span className="text-sm font-medium">Recurring project?</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  For shift-based or periodic work that repeats on a regular schedule
                </p>

                {isRecurring && (
                  <div className="mt-3 space-y-4">
                    {/* On period */}
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">On period (working)</p>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={1}
                          max={365}
                          value={rotationOnValue}
                          onChange={e => {
                            const val = parseInt(e.target.value);
                            if (!isNaN(val) && val > 0) setRotationOnValue(val);
                          }}
                          className="w-20"
                        />
                        <select
                          value={rotationOnUnit}
                          onChange={e => setRotationOnUnit(e.target.value as 'days' | 'weeks')}
                          className="px-2 py-2 text-sm border border-input rounded-md bg-background"
                        >
                          <option value="days">Days</option>
                          <option value="weeks">Weeks</option>
                        </select>
                      </div>
                    </div>

                    {/* Off period */}
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Off period (rest)</p>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={1}
                          max={365}
                          value={rotationOffValue}
                          onChange={e => {
                            const val = parseInt(e.target.value);
                            if (!isNaN(val) && val > 0) setRotationOffValue(val);
                          }}
                          className="w-20"
                        />
                        <select
                          value={rotationOffUnit}
                          onChange={e => setRotationOffUnit(e.target.value as 'days' | 'weeks')}
                          className="px-2 py-2 text-sm border border-input rounded-md bg-background"
                        >
                          <option value="days">Days</option>
                          <option value="weeks">Weeks</option>
                        </select>
                      </div>
                    </div>

                    {/* Number of rotations */}
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Number of rotations</p>
                      <p className="text-xs text-muted-foreground">How many times this crew repeats the full on/off cycle</p>
                      <Input
                        type="number"
                        min={1}
                        max={52}
                        value={rotationCount}
                        onChange={e => {
                          const val = parseInt(e.target.value);
                          if (!isNaN(val) && val > 0) setRotationCount(val);
                        }}
                        className="w-20"
                      />
                    </div>

                    {/* Helper text */}
                    {(() => {
                      const onDays = rotationOnValue * (rotationOnUnit === 'weeks' ? 7 : 1);
                      const offDays = rotationOffValue * (rotationOffUnit === 'weeks' ? 7 : 1);
                      const fullCycle = onDays + offDays;
                      const totalDays = rotationCount * fullCycle;
                      const endDateCalc = startDate
                        ? new Date(new Date(startDate).getTime() + totalDays * 86400000).toLocaleDateString()
                        : '—';
                      return (
                        <div className="text-xs text-muted-foreground bg-muted/50 rounded-md p-2 space-y-0.5">
                          <p>Full cycle: <span className="font-medium">{fullCycle} days</span> ({onDays} on + {offDays} off)</p>
                          <p>Total duration: <span className="font-medium">{totalDays} days</span> ({rotationCount} rotation{rotationCount > 1 ? 's' : ''})</p>
                          {startDate && <p>Project ends: <span className="font-medium">{endDateCalc}</span></p>}
                        </div>
                      );
                    })()}

                    {/* Auto-close toggle */}
                    <div className="flex items-center gap-3 pt-2 border-t border-border/30">
                      <Switch
                        checked={autoCloseEnabled}
                        onCheckedChange={(val) => {
                          setAutoCloseEnabled(val);
                          if (!val) setIsBackToBack(false);
                        }}
                      />
                      <div>
                        <p className="text-sm font-medium">Auto-close rotations</p>
                        <p className="text-xs text-muted-foreground">Automatically close and reopen the project at the end of each on-period</p>
                      </div>
                    </div>

                    {/* Back-to-back shifts */}
                    {autoCloseEnabled && (
                      <div className="space-y-3 pt-2 border-t border-border/30">
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={isBackToBack}
                            onCheckedChange={(val) => {
                              setIsBackToBack(val);
                              if (!val) {
                                setShiftPersonnelSelections({});
                                setActiveShiftTab(1);
                              }
                            }}
                          />
                          <div>
                            <p className="text-sm font-medium">Set up back-to-back shifts</p>
                            <p className="text-xs text-muted-foreground">Create multiple crews running the same rotation in sequence</p>
                          </div>
                        </div>

                        {isBackToBack && (
                          <div className="space-y-3 pl-6">
                            <div className="space-y-1">
                              <p className="text-xs font-medium text-muted-foreground">Number of shifts</p>
                              <Input
                                type="number"
                                min={2}
                                max={6}
                                value={shiftCount}
                                onChange={e => {
                                  const val = parseInt(e.target.value);
                                  if (!isNaN(val) && val >= 2 && val <= 6) {
                                    setShiftCount(val);
                                    // Trim shift personnel selections beyond new count
                                    setShiftPersonnelSelections(prev => {
                                      const trimmed: Record<number, PersonnelSelection[]> = {};
                                      for (let n = 1; n <= val; n++) {
                                        if (prev[n]) trimmed[n] = prev[n];
                                      }
                                      return trimmed;
                                    });
                                    if (activeShiftTab > val) setActiveShiftTab(val);
                                  }
                                }}
                                className="w-20"
                              />
                            </div>

                            {/* Naming preview */}
                            {name.trim() && (
                              <div className="text-xs text-muted-foreground bg-muted/50 rounded-md p-2 space-y-0.5">
                                <p className="font-medium">Projects will be created as:</p>
                                {Array.from({ length: shiftCount }, (_, i) => (
                                  <p key={i} className="pl-2">• {name} — Shift {i + 1}</p>
                                ))}
                              </div>
                            )}

                            {/* Shift schedule preview */}
                            {startDate && (() => {
                              const onDays = rotationOnValue * (rotationOnUnit === 'weeks' ? 7 : 1);
                              return (
                                <div className="text-xs text-muted-foreground bg-muted/50 rounded-md p-2 space-y-0.5">
                                  <p className="font-medium">Shift schedule:</p>
                                  {Array.from({ length: shiftCount }, (_, i) => {
                                    const offsetDays = i * onDays;
                                    const shiftStart = new Date(new Date(startDate).getTime() + offsetDays * 86400000);
                                    const shiftEnd = new Date(shiftStart.getTime() + onDays * 86400000);
                                    return (
                                      <p key={i} className="pl-2">
                                        Shift {i + 1}: {shiftStart.toLocaleDateString()} → {shiftEnd.toLocaleDateString()}
                                      </p>
                                    );
                                  })}
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
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

            <FreelancerFilters
              personnelFilter={projectPersonnelFilter}
              onPersonnelFilterChange={setProjectPersonnelFilter}
            />

            <div className="flex items-center gap-2 bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-1.5">
              <span className="text-sm">💡</span>
              <p className="text-xs text-muted-foreground">
                <span className="font-medium">Invite</span> sends the person an invitation to accept or decline. <span className="font-medium">Assign</span> adds them directly to the project.
              </p>
            </div>

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
                            <Briefcase className="h-3 w-3" />
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
                            <Globe className="h-3 w-3" />
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
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 shrink-0"
                onClick={() => setSortOption(prev => prev === 'recent' ? 'alphabetical' : 'recent')}
              >
                <ArrowUpDown className="h-3.5 w-3.5" />
                {sortOption === 'recent' ? 'Recent' : 'A-Z'}
              </Button>
            </div>

            {/* Shift Tabs — when back-to-back shifts are enabled */}
            {isRecurring && isBackToBack && (
              <Tabs
                value={String(activeShiftTab)}
                onValueChange={(val) => setActiveShiftTab(Number(val))}
                className="w-full"
              >
                <TabsList className="w-full flex overflow-x-auto">
                  {Array.from({ length: shiftCount }, (_, i) => {
                    const n = i + 1;
                    const tabLabel = name.trim() ? `${name} — Shift ${n}` : `Shift ${n}`;
                    const tabCount = (shiftPersonnelSelections[n] || []).length;
                    return (
                      <TabsTrigger key={n} value={String(n)} className="flex-1 min-w-0 text-xs truncate gap-1">
                        <span className="truncate">{tabLabel}</span>
                        {tabCount > 0 && (
                          <Badge variant="secondary" className="h-4 min-w-4 px-1 text-[10px] ml-1 shrink-0">
                            {tabCount}
                          </Badge>
                        )}
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
              </Tabs>
            )}

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
                  {projectPersonnelFilter !== 'employees'
                    ? 'No personnel available for project assignment.'
                    : 'No personnel available. Switch to "All" or "Freelancers" to see more options.'}
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
                         className={`flex items-center gap-3 p-2 rounded-md hover:bg-muted transition-colors ${selected ? 'bg-muted/50' : ''} ${suggestion ? 'ring-1 ring-primary/20' : ''}`}
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
                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setPreviewPersonnel(person)}>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium truncate">
                              {person.name}
                            </span>
                            {categoryInfo && (
                              <Badge 
                                variant={categoryInfo.variant} 
                                className="font-normal"
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
                        <div data-toggle-mode onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()} onPointerUp={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                          <ToggleGroup
                            type="single"
                            value={selected ? mode : undefined}
                            onValueChange={(val) => { if (val) setPersonnelMode(person.id, val as PersonnelMode); }}
                            className="bg-primary p-0.5 rounded-md flex-shrink-0"
                          >
                            <ToggleGroupItem
                              value="invite"
                              className="h-5 px-2 text-[10px] text-primary-foreground hover:bg-primary-foreground/20 data-[state=on]:bg-primary-foreground data-[state=on]:text-primary rounded-sm"
                            >
                              Invite
                            </ToggleGroupItem>
                            <ToggleGroupItem
                              value="assign"
                              className="h-5 px-2 text-[10px] text-primary-foreground hover:bg-primary-foreground/20 data-[state=on]:bg-primary-foreground data-[state=on]:text-primary rounded-sm"
                            >
                              Assign
                            </ToggleGroupItem>
                          </ToggleGroup>
                        </div>
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

            {(isBackToBack ? totalShiftSelections > 0 : currentSelections.length > 0) && (
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                {isBackToBack ? (
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {totalShiftSelections} total across {shiftCount} shifts
                  </span>
                ) : (
                  <>
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
                  </>
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
