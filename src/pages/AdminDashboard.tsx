import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import dashboardBgPattern from '@/assets/dashboard-bg-pattern.png';
import { DashboardHeader } from '@/components/DashboardHeader';
import { DashboardStats } from '@/components/DashboardStats';
import { PersonnelCard } from '@/components/PersonnelCard';
import { PersonnelDetail } from '@/components/PersonnelDetail';
import { ProjectDetail } from '@/components/ProjectDetail';
import { ChatBot } from '@/components/ChatBot';
import { AddPersonnelDialog } from '@/components/AddPersonnelDialog';
import { AddProjectDialog } from '@/components/AddProjectDialog';

import { CompliancePlanGenerator } from '@/components/CompliancePlanGenerator';
import { ExpiryTimeline } from '@/components/ExpiryTimeline';
import { RecentRegistrations } from '@/components/RecentRegistrations';
import { ProjectsTab } from '@/components/ProjectsTab';
import { CategoriesSection } from '@/components/CategoriesSection';
import { BillingSection, BillingSubscription } from '@/components/BillingSection';
import { DataAcknowledgementsManager } from '@/components/DataAcknowledgementsManager';
import { LocationStandardizationTool } from '@/components/LocationStandardizationTool';
import { CertificateLocationNormalizationTool } from '@/components/CertificateLocationNormalizationTool';
import { IssuerTypesManager } from '@/components/IssuerTypesManager';

import { RegistrationLinkCard } from '@/components/RegistrationLinkCard';
import { AdminOverview } from '@/components/AdminOverview';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { MapPin, ShieldCheck, Award, Link2, FileText, MessageSquare, RefreshCw, CreditCard, Settings2, Brain } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

import { FeedbackList } from '@/components/FeedbackList';
import { ActivationOverview } from '@/components/ActivationOverview';
import { PersonnelFilters, PersonnelSortOption, CertificateFilterMode, ComplianceStatusFilter } from '@/components/PersonnelFilters';
import { getPersonnelOverallStatus } from '@/lib/certificateUtils';
import { useCertificateCategories } from '@/hooks/useCertificateCategories';
import { useWorkerGroups } from '@/hooks/useWorkerGroups';
import { usePersonnelWorkerGroups } from '@/hooks/usePersonnelWorkerGroups';
import { AIPersonnelSuggestions } from '@/components/AIPersonnelSuggestions';
import { FreelancerFilters } from '@/components/FreelancerFilters';
import { usePersonnel } from '@/hooks/usePersonnel';
import { useNeedsReviewCount } from '@/hooks/useNeedsReviewCount';
import { useProjects, Project } from '@/hooks/useProjects';
import { usePersonnelAvailability } from '@/hooks/usePersonnelAvailability';
import { useBusinessInfo } from '@/hooks/useBusinessInfo';

import { useAuth } from '@/contexts/AuthContext';
import { Personnel } from '@/types';
import { LinkProfileDialog } from '@/components/LinkProfileDialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, LogOut, Plus, Users, LayoutDashboard, FolderOpen, Settings, Shield, Building2, Bell, Search, ChevronDown, Send, List, FileDown, Sparkles, X } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { CompanyCard } from '@/components/CompanyCard';
import { SendNotificationDialog } from '@/components/SendNotificationDialog';
import { CertificateCategoryOnboarding } from '@/components/CertificateCategoryOnboarding';
import { NotificationsLog } from '@/components/NotificationsLog';
import { ExternalSharingDialog } from '@/components/ExternalSharingDialog';
import { getBusinessEntitlement, type BusinessEntitlement } from '@/lib/entitlements';
import { format } from 'date-fns';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { DateRange } from 'react-day-picker';

export default function AdminDashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPersonnel, setSelectedPersonnel] = useState<Personnel | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [previousProject, setPreviousProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState('personnel');
  const [addPersonnelOpen, setAddPersonnelOpen] = useState(false);
  const [addProjectOpen, setAddProjectOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsDeepLink, setSettingsDeepLink] = useState<'review-queue' | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  // Auto-scroll to unmapped certificates when deep-linking from Needs Review card
  useEffect(() => {
    if (settingsOpen && settingsDeepLink === 'review-queue') {
      const timeout = setTimeout(() => {
        document.querySelector('[data-scroll-target="unmapped-certificates"]')
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
      return () => clearTimeout(timeout);
    }
  }, [settingsOpen, settingsDeepLink]);

  // Lifted billing state
  const [liftedSubscription, setLiftedSubscription] = useState<BillingSubscription | null>(null);
  const [liftedEntitlement, setLiftedEntitlement] = useState<BusinessEntitlement | null>(null);
  const [liftedActiveCount, setLiftedActiveCount] = useState<number | null>(null);
  const [liftedLoading, setLiftedLoading] = useState(true);
  const [liftedError, setLiftedError] = useState(false);
  const [sendNotificationOpen, setSendNotificationOpen] = useState(false);
  const [notificationsLogOpen, setNotificationsLogOpen] = useState(false);
  const [externalSharingOpen, setExternalSharingOpen] = useState(false);
  const [billingOpen, setBillingOpen] = useState(false);
  const billingRef = useRef<HTMLDivElement>(null);
  
  const [linkProfileOpen, setLinkProfileOpen] = useState(false);
  const [addPersonnelPrefill, setAddPersonnelPrefill] = useState<{ name: string; email: string } | null>(null);
  const [aiUsage, setAiUsage] = useState<Record<string, { used: number; cap: number }>>({});

  useEffect(() => {
    if (selectedProject || selectedPersonnel) {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
    }
  }, [selectedProject, selectedPersonnel]);
  
  // Filter states (arrays for multi-select)
  
  const [locationFilters, setLocationFilters] = useState<string[]>([]);
  
  const [certificateFilters, setCertificateFilters] = useState<string[]>([]);
  const [departmentFilters, setDepartmentFilters] = useState<string[]>([]);
  const [availabilityDateRange, setAvailabilityDateRange] = useState<DateRange | undefined>(undefined);
  const [personnelTabFilter, setPersonnelTabFilter] = useState<'all' | 'employees' | 'freelancers' | 'custom'>('employees');
  const [overviewFilter, setOverviewFilter] = useState<'all' | 'employees' | 'freelancers' | 'custom'>('employees');
  const [highlightedPersonnelIds, setHighlightedPersonnelIds] = useState<string[]>([]);
  const [aiFilteredPersonnelIds, setAiFilteredPersonnelIds] = useState<string[] | null>(null);
  const [adminUserIds, setAdminUserIds] = useState<Set<string>>(new Set());
  const [sortOption, setSortOption] = useState<PersonnelSortOption>('last_updated');
  const [certificateFilterMode, setCertificateFilterMode] = useState<CertificateFilterMode>('categories');
  const [complianceStatusFilter, setComplianceStatusFilter] = useState<ComplianceStatusFilter>('all');
  // Custom filter state — Overview tab
  const [customFilterPersonnelIds, setCustomFilterPersonnelIds] = useState<string[]>([]);
  const [customFilterRoles, setCustomFilterRoles] = useState<string[]>([]);
  const [customFilterWorkerGroupIds, setCustomFilterWorkerGroupIds] = useState<string[]>([]);
  const [customFilterSkills, setCustomFilterSkills] = useState<string[]>([]);
  // Custom filter state — Personnel tab
  const [personnelCustomIds, setPersonnelCustomIds] = useState<string[]>([]);
  const [personnelCustomRoles, setPersonnelCustomRoles] = useState<string[]>([]);
  const [personnelCustomWorkerGroupIds, setPersonnelCustomWorkerGroupIds] = useState<string[]>([]);
  const [personnelCustomSkills, setPersonnelCustomSkills] = useState<string[]>([]);
  
  
  const { personnel, loading: personnelLoading, refetch } = usePersonnel();
  const { count: needsReviewCount, refetch: refetchNeedsReview } = useNeedsReviewCount();
  const { projects, loading: projectsLoading, addProject, updateProject, addCalendarItem } = useProjects();
  const { isAvailable } = usePersonnelAvailability(availabilityDateRange?.from, availabilityDateRange?.to);
  const { business, refetch: refetchBusiness } = useBusinessInfo();
  const { signOut, profile, user } = useAuth();

  // Fetch AI usage data
  useEffect(() => {
    if (!profile?.business_id) return;
    const fetchUsage = async () => {
      const results: Record<string, { used: number; cap: number }> = {};
      for (const metric of ['ocr', 'chat']) {
        const { data } = await supabase.rpc('check_ai_allowance', {
          p_business_id: profile.business_id!,
          p_event_type: metric,
        });
        if (data) results[metric] = { used: (data as any).used ?? 0, cap: (data as any).cap ?? 0 };
      }
      setAiUsage(results);
    };
    fetchUsage();
  }, [profile?.business_id]);
  
  const { categories: certCategories } = useCertificateCategories();
  const { data: workerGroups = [] } = useWorkerGroups();
  
  const { data: personnelWorkerGroupMemberships = [] } = usePersonnelWorkerGroups();
  
  // Build a lookup: personnelId -> Set of worker group IDs
  const personnelGroupMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    personnelWorkerGroupMemberships.forEach(m => {
      if (!map.has(m.personnel_id)) map.set(m.personnel_id, new Set());
      map.get(m.personnel_id)!.add(m.worker_group_id);
    });
    return map;
  }, [personnelWorkerGroupMemberships]);
  
  const loading = personnelLoading || projectsLoading;

  // Lifted billing data fetch
  const fetchBillingData = useCallback(async () => {
    if (!profile?.business_id) return;
    setLiftedLoading(true);
    setLiftedError(false);
    try {
      const [ent, subResult, countResult] = await Promise.all([
        getBusinessEntitlement(profile.business_id),
        supabase
          .from('billing_subscriptions')
          .select('status, stripe_price_id, trial_end, current_period_end, cancel_at_period_end')
          .eq('business_id', profile.business_id)
          .maybeSingle(),
        supabase
          .from('personnel')
          .select('id', { count: 'exact', head: true })
          .eq('business_id', profile.business_id)
          .eq('activated', true),
      ]);
      setLiftedEntitlement(ent);
      if (subResult.error) throw subResult.error;
      setLiftedSubscription(subResult.data as BillingSubscription | null);
      if (countResult.error) throw countResult.error;
      setLiftedActiveCount(typeof countResult.count === 'number' ? countResult.count : null);
    } catch (err) {
      console.error('Billing data fetch error:', err);
      setLiftedError(true);
    } finally {
      setLiftedLoading(false);
    }
  }, [profile?.business_id]);

  useEffect(() => { fetchBillingData(); }, [fetchBillingData]);

  // Derived billing helpers
  const tierLabel = liftedEntitlement?.is_unlimited
    ? 'Enterprise'
    : (liftedEntitlement?.tier ?? 'starter').charAt(0).toUpperCase() + (liftedEntitlement?.tier ?? 'starter').slice(1);
  const capDisplay = liftedEntitlement?.is_unlimited ? '∞' : String(liftedEntitlement?.profile_cap ?? 25);

  const getStatusBadge = () => {
    if (liftedError) return <Badge variant="outline" className="text-muted-foreground" title="Could not load subscription status">Unknown</Badge>;
    if (!liftedSubscription) {
      if (liftedEntitlement?.is_unlimited) return <Badge variant="secondary">Manual</Badge>;
      return <Badge variant="outline">No plan</Badge>;
    }
    const s = liftedSubscription.status;
    if (s === 'active') return <Badge variant="active">Active</Badge>;
    if (s === 'trialing') return <Badge variant="secondary">Trialing</Badge>;
    if (['past_due', 'unpaid', 'incomplete', 'incomplete_expired'].includes(s ?? '')) return <Badge variant="destructive">Past due</Badge>;
    if (s === 'canceled') return <Badge variant="outline">Canceled</Badge>;
    return <Badge variant="outline">{s}</Badge>;
  };

  const getNearCapBadge = () => {
    if (liftedEntitlement?.is_unlimited || liftedActiveCount === null) return null;
    const cap = liftedEntitlement?.profile_cap ?? 25;
    const threshold = liftedEntitlement?.tier === 'starter' ? 0.9 : 0.85;
    if (liftedActiveCount >= cap) return <Badge variant="destructive" className="text-[10px]">Cap reached</Badge>;
    if (liftedActiveCount >= threshold * cap) return <Badge variant="secondary" className="text-[10px]">Near limit</Badge>;
    return null;
  };

  // Find the admin's own personnel record
  const myProfile = useMemo(() =>
    personnel.find(p => p.userId === user?.id),
    [personnel, user?.id]
  );

  const handleMyProfileClick = useCallback(() => {
    if (myProfile) {
      setSelectedPersonnel(myProfile);
    } else {
      setLinkProfileOpen(true);
    }
  }, [myProfile]);

  // Fetch admin user IDs immediately when business_id is available
  useEffect(() => {
    if (!profile?.business_id) return;

    const fetchAdminUserIds = async () => {
      try {
        const { data: adminRoles, error: rolesError } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'admin');

        if (rolesError) throw rolesError;

        if (adminRoles && adminRoles.length > 0) {
          const adminIds = adminRoles.map((r) => r.user_id);
          
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id')
            .in('id', adminIds)
            .eq('business_id', profile.business_id);

          if (profilesError) throw profilesError;

          setAdminUserIds(new Set(profiles?.map((p) => p.id) || []));
        }
      } catch (error) {
        console.error('Error fetching admin user IDs:', error);
      }
    };

    fetchAdminUserIds();
  }, [profile?.business_id]);

  // Get unique locations for filter dropdown
  const uniqueLocations = useMemo(() => {
    const locations = [...new Set(personnel.map(p => p.location))].filter(Boolean).sort();
    return locations;
  }, [personnel]);

  // Get unique certificate names for filter dropdown (types)
  const uniqueCertificates = useMemo(() => {
    const certs = new Set<string>();
    personnel.forEach(p => {
      p.certificates.forEach(c => certs.add(c.name));
    });
    return [...certs].sort();
  }, [personnel]);

  // Get unique certificate category names for filter dropdown
  const uniqueCertificateCategories = useMemo(() => {
    return certCategories.map(c => c.name).sort();
  }, [certCategories]);

  // Get personnel certificate categories (from their actual certificates)
  const personnelCertificateCategoriesMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    personnel.forEach(p => {
      const categories = new Set<string>();
      p.certificates.forEach(c => {
        if (c.category) {
          categories.add(c.category);
        }
      });
      map.set(p.id, categories);
    });
    return map;
  }, [personnel]);

  // Get unique issuers for filter dropdown
  const uniqueIssuers = useMemo(() => {
    const issuers = new Set<string>();
    personnel.forEach(p => {
      p.certificates.forEach(c => {
        if (c.issuingAuthority) issuers.add(c.issuingAuthority);
      });
    });
    return [...issuers].sort();
  }, [personnel]);

  // Get personnel issuers map
  const personnelIssuersMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    personnel.forEach(p => {
      const issuers = new Set<string>();
      p.certificates.forEach(c => {
        if (c.issuingAuthority) issuers.add(c.issuingAuthority);
      });
      map.set(p.id, issuers);
    });
    return map;
  }, [personnel]);

  // Helper: apply category filter to a person
  const applyCategoryFilter = useCallback((
    p: Personnel,
    filter: 'all' | 'employees' | 'freelancers' | 'custom',
    customIds: string[],
    customRoles: string[],
    customGroupIds: string[],
    customSkills: string[] = [],
  ) => {
    const isFreelancer = p.category === 'freelancer';
    if (filter === 'employees' && isFreelancer) return false;
    if (filter === 'freelancers' && !isFreelancer) return false;
    if (filter === 'custom') {
      const inById = customIds.includes(p.id);
      const inByRole = customRoles.includes(p.role);
      const inByGroup = customGroupIds.length > 0 && (personnelGroupMap.get(p.id) || new Set()).size > 0
        && customGroupIds.some(gid => personnelGroupMap.get(p.id)?.has(gid));
      const inBySkill = customSkills.length > 0 && (p.skills || []).some(s => customSkills.includes(s));
      if (!inById && !inByRole && !inByGroup && !inBySkill) return false;
    }
    return true;
  }, [personnelGroupMap]);

  // Shared filtering logic (excludes category filter)
  const applyCommonFilters = useCallback((p: Personnel) => {
    // Search query filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        p.name.toLowerCase().includes(query) ||
        p.role.toLowerCase().includes(query) ||
        p.location.toLowerCase().includes(query) ||
        p.certificates.some((c) => c.name.toLowerCase().includes(query));
      if (!matchesSearch) return false;
    }
    
    
    // Location filter (multi-select)
    if (locationFilters.length > 0 && !locationFilters.includes(p.location)) return false;
    
    // Certificate filter (multi-select: personnel must have ALL selected certificates/categories)
    if (certificateFilters.length > 0) {
      if (certificateFilterMode === 'categories') {
        const personnelCategories = personnelCertificateCategoriesMap.get(p.id) || new Set<string>();
        const hasAllCategories = certificateFilters.every(cat => personnelCategories.has(cat));
        if (!hasAllCategories) return false;
      } else if (certificateFilterMode === 'issuers') {
        const personnelIssuers = personnelIssuersMap.get(p.id) || new Set<string>();
        const hasAllIssuers = certificateFilters.every(issuer => personnelIssuers.has(issuer));
        if (!hasAllIssuers) return false;
      } else {
        const personnelCertNames = p.certificates.map(c => c.name);
        const hasAllCerts = certificateFilters.every(cert => personnelCertNames.includes(cert));
        if (!hasAllCerts) return false;
      }
    }
    
    // Department filter (multi-select)
    if (departmentFilters.length > 0 && (!p.department || !departmentFilters.includes(p.department))) return false;
    
    // Availability filter
    if (availabilityDateRange?.from && !isAvailable(p.id)) return false;
    
    // Compliance status filter
    if (complianceStatusFilter !== 'all') {
      const status = getPersonnelOverallStatus(p);
      if (status !== complianceStatusFilter) return false;
    }
    
    // AI filter
    if (aiFilteredPersonnelIds !== null && !aiFilteredPersonnelIds.includes(p.id)) return false;
    
    return true;
  }, [searchQuery, locationFilters, certificateFilters, departmentFilters, availabilityDateRange, isAvailable, certificateFilterMode, personnelCertificateCategoriesMap, personnelIssuersMap, aiFilteredPersonnelIds, complianceStatusFilter]);

  const applySorting = useCallback((list: Personnel[]) => {
    return [...list].sort((a, b) => {
      if (sortOption === 'alphabetical') {
        return a.name.localeCompare(b.name);
      } else if (sortOption === 'recent') {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      } else {
        const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return dateB - dateA;
      }
    });
  }, [sortOption]);

  // Personnel tab filtered list
  const filteredPersonnel = useMemo(() => {
    const filtered = personnel.filter(p => applyCategoryFilter(p, personnelTabFilter, personnelCustomIds, personnelCustomRoles, personnelCustomWorkerGroupIds, personnelCustomSkills) && applyCommonFilters(p));
    return applySorting(filtered);
  }, [personnel, personnelTabFilter, personnelCustomIds, personnelCustomRoles, personnelCustomWorkerGroupIds, personnelCustomSkills, applyCategoryFilter, applyCommonFilters, applySorting]);

  // Overview tab filtered list
  const overviewFiltered = useMemo(() => {
    const filtered = personnel.filter(p => applyCategoryFilter(p, overviewFilter, customFilterPersonnelIds, customFilterRoles, customFilterWorkerGroupIds, customFilterSkills) && applyCommonFilters(p));
    return applySorting(filtered);
  }, [personnel, overviewFilter, customFilterPersonnelIds, customFilterRoles, customFilterWorkerGroupIds, customFilterSkills, applyCategoryFilter, applyCommonFilters, applySorting]);


  const handleProjectAdded = async (projectData: Omit<Project, 'id' | 'calendarItems'>): Promise<Project | null> => {
    return await addProject(projectData);
  };

  const handleUpdateProject = async (updatedProject: Project) => {
    // Check if project was previously posted to avoid duplicate notifications
    const previousProject = projects.find(p => p.id === updatedProject.id);
    const wasPosted = previousProject?.isPosted || false;
    const success = await updateProject(updatedProject, wasPosted);
    if (success) {
      setSelectedProject(updatedProject);
    }
  };

  const handleAddCalendarItem = async (projectId: string, date: string, description: string) => {
    await addCalendarItem(projectId, { date, description });
  };

  // No full-screen spinner - we render the shell immediately and show skeletons in content areas

  // Determine branch content for personnel/project detail views
  let branchContent: React.ReactNode = null;

  if (selectedPersonnel) {
    const currentPersonnel = personnel.find(p => p.id === selectedPersonnel.id) || selectedPersonnel;
    
    const handleBack = () => {
      if (previousProject) {
        const updatedProject = projects.find(p => p.id === previousProject.id) || previousProject;
        setSelectedPersonnel(null);
        setSelectedProject(updatedProject);
        setPreviousProject(null);
      } else {
        setSelectedPersonnel(null);
      }
    };
    
    branchContent = (
      <main className="w-full max-w-[1320px] mx-auto canvas-padding py-6 bg-background shadow-lg min-h-[calc(100vh-80px)]">
        <PersonnelDetail
          personnel={currentPersonnel}
          onBack={handleBack}
          onRefresh={refetch}
          backLabel={previousProject ? `Back to ${previousProject.name}` : undefined}
        />
      </main>
    );
  } else if (selectedProject) {
    branchContent = (
      <main className="w-full max-w-[1320px] mx-auto canvas-padding py-6 bg-background shadow-lg min-h-[calc(100vh-80px)]">
        <ProjectDetail
          project={selectedProject}
          personnel={personnel}
          onBack={() => {
            setSelectedProject(null);
            setActiveTab('projects');
          }}
          onUpdateProject={handleUpdateProject}
          onPersonnelClick={(person) => {
            setPreviousProject(selectedProject);
            setSelectedProject(null);
            setSelectedPersonnel(person);
          }}
          businessName={business?.name}
        />
      </main>
    );
  }

  if (branchContent) {
    return (
      <div className="min-h-screen" style={{ backgroundImage: `url(${dashboardBgPattern})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }}>
        <DashboardHeader onMyProfileClick={handleMyProfileClick} hasLinkedProfile={!!myProfile} />
        {branchContent}
        <ChatBot isAdmin />
        <LinkProfileDialog
          open={linkProfileOpen}
          onOpenChange={setLinkProfileOpen}
          userId={user?.id || ''}
          userEmail={profile?.email || ''}
          userName={profile?.full_name || ''}
          personnel={personnel}
          onLinked={refetch}
          onCreateNew={() => setAddPersonnelOpen(true)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundImage: `url(${dashboardBgPattern})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }}>
      <DashboardHeader onMyProfileClick={handleMyProfileClick} hasLinkedProfile={!!myProfile} />
      {profile?.business_id && <CertificateCategoryOnboarding businessId={profile.business_id} onComplete={() => {}} />}

      <main className="w-full max-w-[1320px] mx-auto canvas-padding py-6 space-y-6 bg-background shadow-lg min-h-[calc(100vh-80px)]">
        {/* Business Header */}
        {business && (
          <div className="flex items-center gap-4 mb-2">
            {business.logo_url ? (
              <img 
                src={business.logo_url} 
                alt={`${business.name} logo`}
                className="h-14 w-14 object-contain rounded-lg border bg-background"
              />
            ) : (
              <div className="h-14 w-14 rounded-lg border bg-muted flex items-center justify-center">
                <Building2 className="h-7 w-7 text-muted-foreground" />
              </div>
            )}
            <div>
              <h2 className="text-xl font-semibold text-foreground">{business.name}</h2>
              {business.org_number && (
                <p className="text-sm text-muted-foreground">Org. {business.org_number}</p>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back, {profile?.full_name || profile?.email}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setAddPersonnelOpen(true)}>
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Add Personnel</span>
            </Button>
            <Button onClick={() => setAddProjectOpen(true)}>
              <FolderOpen className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">New Project</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="bg-white dark:bg-card">
                  <Bell className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Actions</span>
                  <ChevronDown className="h-4 w-4 ml-1 sm:ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setExternalSharingOpen(true)}>
                  <FileDown className="h-4 w-4 mr-2" />
                  External Sharing
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSendNotificationOpen(true)}>
                  <Send className="h-4 w-4 mr-2" />
                  Send Notification
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setNotificationsLogOpen(true)}>
                  <List className="h-4 w-4 mr-2" />
                  Notifications Log
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" className="bg-white dark:bg-card" onClick={() => setSettingsOpen(true)}>
              <Settings className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Settings</span>
            </Button>
            <Button variant="outline" className="bg-white dark:bg-card" onClick={signOut}>
              <LogOut className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>

        <DashboardStats
          personnel={personnel}
          needsReviewCount={needsReviewCount}
          onNeedsReviewClick={() => {
            setSettingsOpen(true);
            setSettingsDeepLink('review-queue');
          }}
          onStatClick={(status) => {
            setPersonnelTabFilter('all');
            setActiveTab('personnel');
            setComplianceStatusFilter(status === 'valid' ? 'valid' : status === 'expiring' ? 'expiring' : 'expired');
          }}
        />
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 p-1.5 h-12">
            <TabsTrigger value="personnel" className="flex items-center gap-2 text-base">
              <Users className="h-5 w-5" />
              Personnel
            </TabsTrigger>
            <TabsTrigger value="overview" className="flex items-center gap-2 text-base">
              <LayoutDashboard className="h-5 w-5" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="projects" className="flex items-center gap-2 text-base">
              <FolderOpen className="h-5 w-5" />
              Projects
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="personnel" className="mt-6">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="relative w-full max-w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search personnel..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 border-border"
                />
              </div>
              <FreelancerFilters
                personnelFilter={personnelTabFilter}
                onPersonnelFilterChange={setPersonnelTabFilter}
                personnel={personnel}
                customPersonnelIds={personnelCustomIds}
                customRoles={personnelCustomRoles}
                customWorkerGroupIds={personnelCustomWorkerGroupIds}
                customSkills={personnelCustomSkills}
                onCustomFilterChange={(ids, roles, workerGroupIds, skills) => {
                  setPersonnelCustomIds(ids);
                  setPersonnelCustomRoles(roles);
                  setPersonnelCustomWorkerGroupIds(workerGroupIds);
                  setPersonnelCustomSkills(skills);
                }}
              />
            </div>
            
            <AIPersonnelSuggestions
              personnel={filteredPersonnel}
              onApplyFilters={() => {}}
              onHighlightPersonnel={setHighlightedPersonnelIds}
              onClearHighlight={() => setHighlightedPersonnelIds([])}
              includeEmployees={personnelTabFilter !== 'freelancers'}
              includeFreelancers={personnelTabFilter !== 'employees'}
              onFilterByAI={setAiFilteredPersonnelIds}
            />
            
            <PersonnelFilters
              locationFilters={locationFilters}
              onLocationFiltersChange={setLocationFilters}
              certificateFilters={certificateFilters}
              onCertificateFiltersChange={setCertificateFilters}
              departmentFilters={departmentFilters}
              onDepartmentFiltersChange={setDepartmentFilters}
              locations={uniqueLocations}
              certificates={uniqueCertificates}
              certificateCategories={uniqueCertificateCategories}
              certificateIssuers={uniqueIssuers}
              availabilityDateRange={availabilityDateRange}
              onAvailabilityDateRangeChange={setAvailabilityDateRange}
              sortOption={sortOption}
              onSortOptionChange={setSortOption}
              certificateFilterMode={certificateFilterMode}
              onCertificateFilterModeChange={setCertificateFilterMode}
              complianceStatusFilter={complianceStatusFilter}
              onComplianceStatusFilterChange={setComplianceStatusFilter}
              resultCount={filteredPersonnel.length}
            />
            
            {aiFilteredPersonnelIds !== null && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10 border border-primary/20">
                <div className="flex items-center gap-2 text-sm text-primary">
                  <Sparkles className="h-4 w-4" />
                  <span>AI search active — showing {filteredPersonnel.length} results</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setAiFilteredPersonnelIds(null);
                    setHighlightedPersonnelIds([]);
                  }}
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear Search
                </Button>
              </div>
            )}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-40 w-full rounded-lg" />
                ))}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-4 items-stretch">
                  {filteredPersonnel.map((p) => (
                    <PersonnelCard
                      key={p.id}
                      personnel={p}
                      onClick={() => setSelectedPersonnel(p)}
                      onRemoved={refetch}
                      highlighted={highlightedPersonnelIds.includes(p.id)}
                      isAdmin={p.userId ? adminUserIds.has(p.userId) : false}
                    />
                  ))}
                </div>
                
                {filteredPersonnel.length === 0 && (
                  <div className="text-center py-12">
                    <div className="text-5xl mb-4">👤</div>
                    <p className="text-muted-foreground">
                      {searchQuery || locationFilters.length > 0 || certificateFilters.length > 0 || departmentFilters.length > 0 || availabilityDateRange?.from || personnelTabFilter === 'custom'
                        ? 'No personnel found matching your filters'
                        : 'No personnel yet. Add your first team member to get started.'}
                    </p>
                  </div>
                )}
              </>
            )}
          </TabsContent>
          
          <TabsContent value="overview" className="mt-6 space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 h-10 px-3 w-full max-w-96">
                <LayoutDashboard className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-muted-foreground">Compliance at a Glance</span>
              </div>
              <FreelancerFilters
                personnelFilter={overviewFilter}
                onPersonnelFilterChange={setOverviewFilter}
                personnel={personnel}
                customPersonnelIds={customFilterPersonnelIds}
                customRoles={customFilterRoles}
                customWorkerGroupIds={customFilterWorkerGroupIds}
                customSkills={customFilterSkills}
                onCustomFilterChange={(ids, roles, workerGroupIds, skills) => {
                  setCustomFilterPersonnelIds(ids);
                  setCustomFilterRoles(roles);
                  setCustomFilterWorkerGroupIds(workerGroupIds);
                  setCustomFilterSkills(skills);
                }}
              />
            </div>
            <CompliancePlanGenerator
              personnel={personnel}
              personnelFilter={overviewFilter}
              customPersonnelIds={customFilterPersonnelIds}
              customRoles={customFilterRoles}
              customWorkerGroupIds={customFilterWorkerGroupIds}
              customSkills={customFilterSkills}
              businessName={business?.name}
            />
            <ExpiryTimeline 
              personnel={personnel} 
              personnelFilter={overviewFilter}
              customPersonnelIds={customFilterPersonnelIds}
              customRoles={customFilterRoles}
              customWorkerGroupIds={customFilterWorkerGroupIds}
              customSkills={customFilterSkills}
            />
            <RecentRegistrations 
              personnel={personnel}
              onPersonnelClick={setSelectedPersonnel}
              initialLimit={5}
              incrementAmount={5}
            />
          </TabsContent>
          
          <TabsContent value="projects" className="mt-6">
            <ProjectsTab 
              projects={projects} 
              personnel={personnel} 
              onSelectProject={setSelectedProject}
            />
          </TabsContent>
        </Tabs>

        {settingsOpen && (
          <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
            <div className="fixed inset-y-0 right-0 w-full max-w-5xl bg-background border-l shadow-lg">
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-lg font-semibold">Settings</h2>
                <Button variant="ghost" size="icon" onClick={() => { setSettingsOpen(false); setSettingsDeepLink(null); refetchNeedsReview(); refetch(); }}>
                  <span className="sr-only">Close</span>
                  ✕
                </Button>
              </div>
               <div className="p-4 overflow-y-auto h-[calc(100vh-65px)] space-y-6">
                {/* Quick-glance header */}
                <div className="flex items-center gap-2 text-sm flex-wrap">
                  <span className="font-medium">{business?.name ?? 'Your Company'}</span>
                  <span className="text-muted-foreground">·</span>
                  <Badge variant="outline" className="text-xs">{tierLabel}</Badge>
                  {liftedSubscription?.status === 'trialing' && liftedSubscription.trial_end && (
                    <>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground">
                        Trial ends {format(new Date(liftedSubscription.trial_end), 'MMM d')}
                      </span>
                    </>
                  )}
                  {['past_due', 'unpaid', 'incomplete', 'incomplete_expired'].includes(liftedSubscription?.status ?? '') && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-2 py-0.5">
                      <span className="inline-block h-2 w-2 rounded-full bg-destructive" />
                      <span className="text-xs text-destructive">Past due</span>
                    </span>
                  )}
                </div>

                {/* GROUP 1: PLAN & BILLING */}
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-2 pb-1">Plan & Billing</p>

                <Collapsible>
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-4 rounded-lg border border-border/50 bg-card hover:shadow-md hover:ring-2 hover:ring-[#C4B5FD] hover:shadow-[#C4B5FD]/20 transition-all group">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5 text-primary" />
                      <span className="font-semibold text-lg">Plan & Usage</span>
                    </div>
                    <div className="min-w-[160px] flex items-center justify-end gap-2">
                      {getStatusBadge()}
                      <span className="text-xs text-muted-foreground">
                        {liftedActiveCount ?? '—'} / {capDisplay}
                      </span>
                      {getNearCapBadge()}
                      <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <ActivationOverview 
                      personnel={personnel} 
                      onRefresh={refetch}
                      onEditPersonnel={(person) => {
                        setSettingsOpen(false);
                        setSelectedPersonnel(person);
                      }}
                      onPersonnelRemoved={refetch}
                      onChoosePlan={() => {
                        setBillingOpen(true);
                        setTimeout(() => billingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
                      }}
                      subscriptionStatus={liftedSubscription?.status ?? null}
                      liftedEntitlement={liftedEntitlement}
                      liftedActiveCount={liftedActiveCount}
                    />
                  </CollapsibleContent>
                </Collapsible>

                <div ref={billingRef}>
                  <Collapsible open={billingOpen} onOpenChange={setBillingOpen}>
                    <CollapsibleTrigger className="flex items-center justify-between w-full p-4 rounded-lg border border-border/50 bg-card hover:shadow-md hover:ring-2 hover:ring-[#C4B5FD] hover:shadow-[#C4B5FD]/20 transition-all group">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-primary" />
                        <span className="font-semibold text-lg">Payment & Billing</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          title="Refresh billing status"
                          aria-label="Refresh billing status"
                          disabled={liftedLoading}
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); fetchBillingData(); }}
                          className={`p-1 rounded hover:bg-muted disabled:opacity-50 transition-opacity ${liftedLoading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                        >
                          <RefreshCw className={`h-4 w-4 text-muted-foreground ${liftedLoading ? 'animate-spin' : ''}`} />
                        </button>
                        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <BillingSection
                        businessId={profile?.business_id}
                        embedded
                        subscription={liftedSubscription}
                        entitlement={liftedEntitlement}
                        activeCount={liftedActiveCount === null ? null : liftedActiveCount}
                      />
                    </CollapsibleContent>
                  </Collapsible>

                  {/* AI Usage */}
                  <Collapsible>
                    <CollapsibleTrigger className="flex items-center justify-between w-full p-4 rounded-lg border border-border/50 bg-card hover:shadow-md hover:ring-2 hover:ring-[#C4B5FD] hover:shadow-[#C4B5FD]/20 transition-all group">
                      <div className="flex items-center gap-2">
                        <Brain className="h-5 w-5 text-primary" />
                        <span className="font-semibold text-lg">AI Usage</span>
                      </div>
                      <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="p-4 space-y-4">
                        <p className="font-medium text-base">AI Usage this month</p>
                        {(['ocr', 'chat'] as const).map((metric) => {
                          const { used = 0, cap = 0 } = aiUsage[metric] ?? {};
                          const isUnlimited = cap >= 999999;
                          const remaining = cap > 0 ? Math.max(0, cap - used) : 0;
                          const remainingPct = isUnlimited ? 100 : (cap > 0 ? Math.round((remaining / cap) * 100) : 0);
                          const barColor = isUnlimited
                            ? '[&>div]:bg-green-500'
                            : remainingPct > 50
                              ? '[&>div]:bg-green-500'
                              : remainingPct > 20
                                ? '[&>div]:bg-amber-500'
                                : '[&>div]:bg-red-500';
                          const label = metric === 'ocr' ? 'OCR Scans' : 'Chat Messages';
                          const remainingLabel = isUnlimited
                            ? `${used} used — Unlimited`
                            : `${remaining} remaining of ${cap}`;
                          return (
                            <div key={metric} className="space-y-1">
                              <div className="flex items-center justify-between text-sm">
                                <span className="font-medium">{label}</span>
                                <span className="text-muted-foreground">{remainingLabel}</span>
                              </div>
                              <Progress value={remainingPct} className={`h-2 ${barColor}`} />
                            </div>
                          );
                        })}
                        <p className="text-xs text-muted-foreground">Resets on the 1st of each month</p>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>

                {/* GROUP 2: ACCESS & TEAM */}
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-4 pb-1">Access & Team</p>

                <Collapsible>
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-4 rounded-lg border border-border/50 bg-card hover:shadow-md hover:ring-2 hover:ring-[#C4B5FD] hover:shadow-[#C4B5FD]/20 transition-all group">
                    <div className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-primary" />
                      <span className="font-semibold text-lg">Team & Admins</span>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="p-4 space-y-4">
                      <p className="text-sm bg-primary text-primary-foreground rounded-md px-3 py-2">Manage team members, roles, and admin access.</p>
                      <AdminOverview />
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                <Collapsible>
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-4 rounded-lg border border-border/50 bg-card hover:shadow-md hover:ring-2 hover:ring-[#C4B5FD] hover:shadow-[#C4B5FD]/20 transition-all group">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-primary" />
                      <span className="font-semibold text-lg">Company</span>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="p-4 space-y-4">
                      <p className="text-sm bg-primary text-primary-foreground rounded-md px-3 py-2">Update your company details, logo, and contact information.</p>
                      <CompanyCard isAdmin mode="inline" onClose={() => refetchBusiness()} />
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* GROUP 3: COMPLIANCE CONFIGURATION */}
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-4 pb-1">Certificate Compliance Configuration</p>

                <Collapsible defaultOpen={settingsDeepLink === 'review-queue'}>
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-4 rounded-lg border border-border/50 bg-card hover:shadow-md hover:ring-2 hover:ring-[#C4B5FD] hover:shadow-[#C4B5FD]/20 transition-all group">
                    <div className="flex items-center gap-2">
                      <Award className="h-5 w-5 text-primary" />
                      <span className="font-semibold text-lg">Categories</span>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CategoriesSection defaultTab={settingsDeepLink === 'review-queue' ? 'certificates' : undefined} defaultSubTab={settingsDeepLink === 'review-queue' ? 'types' : undefined} />
                  </CollapsibleContent>
                </Collapsible>

                <Collapsible>
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-6 rounded-xl border border-border/50 bg-card hover:shadow-md hover:ring-2 hover:ring-[#C4B5FD] hover:shadow-[#C4B5FD]/20 transition-all group">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Settings2 className="h-5 w-5 text-primary" />
                      </div>
                      <span className="font-semibold text-lg">Advanced — data standardisation tools</span>
                    </div>
                    <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-3 space-y-3">

                    <Collapsible>
                      <CollapsibleTrigger className="flex items-center justify-between w-full p-4 rounded-lg border border-border/50 bg-card hover:shadow-md hover:ring-2 hover:ring-[#C4B5FD] hover:shadow-[#C4B5FD]/20 transition-all group">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-5 w-5 text-primary" />
                          <span className="font-semibold text-lg">Issuing Authorities</span>
                        </div>
                        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="p-4 space-y-6">
                          <p className="text-sm bg-primary text-primary-foreground rounded-md px-3 py-2">
                            Manage the official issuing authorities used to organize and group certificates consistently.
                          </p>
                          <IssuerTypesManager />
                        </div>
                      </CollapsibleContent>
                    </Collapsible>

                    <Collapsible>
                      <CollapsibleTrigger className="flex items-center justify-between w-full p-4 rounded-lg border border-border/50 bg-card hover:shadow-md hover:ring-2 hover:ring-[#C4B5FD] hover:shadow-[#C4B5FD]/20 transition-all group">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-5 w-5 text-primary" />
                          <span className="font-semibold text-lg">Locations</span>
                        </div>
                        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="p-4 space-y-4">
                          <p className="text-sm bg-primary text-primary-foreground rounded-md px-3 py-2">Normalize and manage certificate location data.</p>
                          <LocationStandardizationTool />
                          <CertificateLocationNormalizationTool />
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </CollapsibleContent>
                </Collapsible>

                {/* GROUP 4: PRIVACY & TOOLS */}
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-4 pb-1">Privacy & Tools</p>

                <Collapsible>
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-4 rounded-lg border border-border/50 bg-card hover:shadow-md hover:ring-2 hover:ring-[#C4B5FD] hover:shadow-[#C4B5FD]/20 transition-all group">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      <span className="font-semibold text-lg">Privacy & Data</span>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="p-4 space-y-4">
                      <p className="text-sm bg-primary text-primary-foreground rounded-md px-3 py-2">Configure data processing acknowledgements and privacy settings.</p>
                      <DataAcknowledgementsManager
                        embedded
                        personnel={personnel}
                        businessId={profile?.business_id ?? undefined}
                        onPersonnelClick={(person) => {
                          setSettingsOpen(false);
                          setSelectedPersonnel(person);
                        }}
                      />
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                <Collapsible>
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-4 rounded-lg border border-border/50 bg-card hover:shadow-md hover:ring-2 hover:ring-[#C4B5FD] hover:shadow-[#C4B5FD]/20 transition-all group">
                    <div className="flex items-center gap-2">
                      <Link2 className="h-5 w-5 text-primary" />
                      <span className="font-semibold text-lg">Freelancer Registration</span>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="p-4 space-y-4">
                      <p className="text-sm bg-primary text-primary-foreground rounded-md px-3 py-2">Manage registration links for freelancer onboarding.</p>
                      <RegistrationLinkCard embedded />
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* GROUP 5: SUPPORT */}
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-4 pb-1">Support</p>

                <Collapsible open={feedbackOpen} onOpenChange={setFeedbackOpen}>
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-4 rounded-lg border border-border/50 bg-card hover:shadow-md hover:ring-2 hover:ring-[#C4B5FD] hover:shadow-[#C4B5FD]/20 transition-all group">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-primary" />
                      <span className="font-semibold text-lg">Feedback</span>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="p-4 space-y-4">
                      <p className="text-sm bg-primary text-primary-foreground rounded-md px-3 py-2">View feedback and improvement suggestions from your team.</p>
                      <FeedbackList embedded open={feedbackOpen} />
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </div>
          </div>
        )}
        </main>
      
        <ChatBot isAdmin />
      
        <AddPersonnelDialog
          open={addPersonnelOpen}
          onOpenChange={setAddPersonnelOpen}
          onPersonnelAdded={refetch}
        />
      
        <AddProjectDialog
          open={addProjectOpen}
          onOpenChange={setAddProjectOpen}
          personnel={personnel}
          onProjectAdded={handleProjectAdded}
        />
      
        <SendNotificationDialog
          open={sendNotificationOpen}
          onOpenChange={setSendNotificationOpen}
          personnel={personnel}
        />
      
        <NotificationsLog
          open={notificationsLogOpen}
          onOpenChange={setNotificationsLogOpen}
        />

        <ExternalSharingDialog
          open={externalSharingOpen}
          onOpenChange={setExternalSharingOpen}
          projects={projects}
          personnel={personnel}
          businessName={business?.name}
        />


        <LinkProfileDialog
          open={linkProfileOpen}
          onOpenChange={setLinkProfileOpen}
          userId={user?.id || ''}
          userEmail={profile?.email || ''}
          userName={profile?.full_name || ''}
          personnel={personnel}
          onLinked={refetch}
          onCreateNew={() => setAddPersonnelOpen(true)}
        />
    </div>
  );
}
