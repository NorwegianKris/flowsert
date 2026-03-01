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
import { ComplianceSnapshot } from '@/components/ComplianceSnapshot';
import { ExpiryTimeline } from '@/components/ExpiryTimeline';
import { RecentRegistrations } from '@/components/RecentRegistrations';
import { ProjectsTab } from '@/components/ProjectsTab';
import { CategoriesSection } from '@/components/CategoriesSection';
import { BillingSection, BillingSubscription } from '@/components/BillingSection';
import { DataAcknowledgementsManager } from '@/components/DataAcknowledgementsManager';
import { LocationStandardizationTool } from '@/components/LocationStandardizationTool';

import { RegistrationLinkCard } from '@/components/RegistrationLinkCard';
import { AdminOverview } from '@/components/AdminOverview';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { MapPin, ShieldCheck, Award, Link2, FileText, MessageSquare, RefreshCw, CreditCard } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

import { FeedbackList } from '@/components/FeedbackList';
import { ActivationOverview } from '@/components/ActivationOverview';
import { PersonnelFilters, PersonnelSortOption, CertificateFilterMode } from '@/components/PersonnelFilters';
import { useCertificateCategories } from '@/hooks/useCertificateCategories';
import { useWorkerGroups } from '@/hooks/useWorkerGroups';
import { usePersonnelGroupFilter } from '@/hooks/usePersonnelGroupFilter';
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
        document.querySelector('[data-testid="unmapped-certificates-section"]')
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

  useEffect(() => {
    if (selectedProject || selectedPersonnel) {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
    }
  }, [selectedProject, selectedPersonnel]);
  
  // Filter states (arrays for multi-select)
  const [roleFilters, setRoleFilters] = useState<string[]>([]);
  const [locationFilters, setLocationFilters] = useState<string[]>([]);
  
  const [certificateFilters, setCertificateFilters] = useState<string[]>([]);
  const [departmentFilters, setDepartmentFilters] = useState<string[]>([]);
  const [availabilityDateRange, setAvailabilityDateRange] = useState<DateRange | undefined>(undefined);
  const [includeEmployees, setIncludeEmployees] = useState(true);
  const [includeFreelancers, setIncludeFreelancers] = useState(false);
  const [showFreelancersOnly, setShowFreelancersOnly] = useState(false);
  const [highlightedPersonnelIds, setHighlightedPersonnelIds] = useState<string[]>([]);
  const [aiFilteredPersonnelIds, setAiFilteredPersonnelIds] = useState<string[] | null>(null);
  const [adminUserIds, setAdminUserIds] = useState<Set<string>>(new Set());
  const [sortOption, setSortOption] = useState<PersonnelSortOption>('last_updated');
  const [certificateFilterMode, setCertificateFilterMode] = useState<CertificateFilterMode>('categories');
  const [complianceFilter, setComplianceFilter] = useState<'all' | 'employees' | 'freelancers' | 'custom'>('employees');
  const [customFilterPersonnelIds, setCustomFilterPersonnelIds] = useState<string[]>([]);
  const [customFilterRoles, setCustomFilterRoles] = useState<string[]>([]);
  const [customFilterWorkerGroupIds, setCustomFilterWorkerGroupIds] = useState<string[]>([]);
  const [workerGroupFilters, setWorkerGroupFilters] = useState<string[]>([]);
  
  const { personnel, loading: personnelLoading, refetch } = usePersonnel();
  const { count: needsReviewCount } = useNeedsReviewCount();
  const { projects, loading: projectsLoading, addProject, updateProject, addCalendarItem } = useProjects();
  const { isAvailable } = usePersonnelAvailability(availabilityDateRange?.from, availabilityDateRange?.to);
  const { business, refetch: refetchBusiness } = useBusinessInfo();
  const { signOut, profile, user } = useAuth();
  
  const { categories: certCategories } = useCertificateCategories();
  const { data: workerGroups = [] } = useWorkerGroups();
  
  const allPersonnelIds = useMemo(() => personnel.map(p => p.id), [personnel]);
  const { personnelIdFilter: groupFilter } = usePersonnelGroupFilter(workerGroupFilters, false, allPersonnelIds);
  
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

  const filteredPersonnel = useMemo(() => {
    const filtered = personnel.filter((p) => {
      // Employee filter
      const isEmployee = p.category === 'employee' || !p.category || (p.category !== 'freelancer');
      const isFreelancer = p.category === 'freelancer';
      
      // If showing freelancers only, filter out non-freelancers
      if (showFreelancersOnly && !isFreelancer) return false;
      
      // Exclude employees if not included
      if (!includeEmployees && !isFreelancer) return false;
      
      // If not including freelancers and not showing only, exclude freelancers
      if (!includeFreelancers && !showFreelancersOnly && isFreelancer) return false;
      
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
      
      // Role filter (multi-select)
      if (roleFilters.length > 0 && !roleFilters.includes(p.role)) return false;
      
      // Location filter (multi-select)
      if (locationFilters.length > 0 && !locationFilters.includes(p.location)) return false;
      
      
      // Certificate filter (multi-select: personnel must have ALL selected certificates/categories)
      if (certificateFilters.length > 0) {
        if (certificateFilterMode === 'categories') {
          // Filter by certificate categories
          const personnelCategories = personnelCertificateCategoriesMap.get(p.id) || new Set<string>();
          const hasAllCategories = certificateFilters.every(cat => personnelCategories.has(cat));
          if (!hasAllCategories) return false;
        } else if (certificateFilterMode === 'issuers') {
          const personnelIssuers = personnelIssuersMap.get(p.id) || new Set<string>();
          const hasAllIssuers = certificateFilters.every(issuer => personnelIssuers.has(issuer));
          if (!hasAllIssuers) return false;
        } else {
          // Filter by certificate types/names
          const personnelCertNames = p.certificates.map(c => c.name);
          const hasAllCerts = certificateFilters.every(cert => personnelCertNames.includes(cert));
          if (!hasAllCerts) return false;
        }
      }
      
      // Department filter (multi-select)
      if (departmentFilters.length > 0 && (!p.department || !departmentFilters.includes(p.department))) return false;
      
      // Availability filter
      if (availabilityDateRange?.from && !isAvailable(p.id)) return false;
      
      // Worker group filter
      if (groupFilter !== null) {
        const groupSet = new Set(groupFilter);
        if (!groupSet.has(p.id)) return false;
      }
      
      // AI filter - applied last, within the current toggle-filtered pool
      if (aiFilteredPersonnelIds !== null && !aiFilteredPersonnelIds.includes(p.id)) {
        return false;
      }
      
      return true;
    });

    // Apply sorting
    return filtered.sort((a, b) => {
      if (sortOption === 'alphabetical') {
        return a.name.localeCompare(b.name);
      } else if (sortOption === 'recent') {
        // Most Recent - sort by createdAt (newest registrations first)
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      } else {
        // Last Updated - sort by updatedAt (newest first)
        const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return dateB - dateA;
      }
    });
  }, [searchQuery, personnel, roleFilters, locationFilters, certificateFilters, departmentFilters, availabilityDateRange, isAvailable, includeEmployees, includeFreelancers, showFreelancersOnly, aiFilteredPersonnelIds, sortOption, certificateFilterMode, personnelCertificateCategoriesMap, personnelIssuersMap, groupFilter]);

  // Ghost group pruning: remove stale group IDs from filters
  useEffect(() => {
    if (workerGroups.length === 0 && workerGroupFilters.length === 0) return;
    const validIds = new Set(workerGroups.map(g => g.id));
    const pruned = workerGroupFilters.filter(id => validIds.has(id));
    if (pruned.length !== workerGroupFilters.length) {
      setWorkerGroupFilters(pruned);
    }
  }, [workerGroups, workerGroupFilters]);

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
                <Button variant="outline">
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
            <Button variant="outline" onClick={() => setSettingsOpen(true)}>
              <Settings className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Settings</span>
            </Button>
            <Button variant="outline" onClick={signOut}>
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
            {/* Search field */}
            <div className="relative w-full sm:w-80 mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search personnel..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-background border-border"
              />
            </div>
            
            <div className="mb-4">
              <FreelancerFilters
                includeEmployees={includeEmployees}
                onIncludeEmployeesChange={setIncludeEmployees}
                includeFreelancers={includeFreelancers}
                onIncludeFreelancersChange={setIncludeFreelancers}
                showFreelancersOnly={showFreelancersOnly}
                onShowFreelancersOnlyChange={setShowFreelancersOnly}
              />
            </div>
            
            <AIPersonnelSuggestions
              personnel={filteredPersonnel}
              onApplyFilters={() => {}}
              onHighlightPersonnel={setHighlightedPersonnelIds}
              onClearHighlight={() => setHighlightedPersonnelIds([])}
              includeEmployees={includeEmployees}
              includeFreelancers={includeFreelancers}
              onFilterByAI={setAiFilteredPersonnelIds}
            />
            
            <PersonnelFilters
              roleFilters={roleFilters}
              onRoleFiltersChange={setRoleFilters}
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
              resultCount={filteredPersonnel.length}
              workerGroups={workerGroups}
              workerGroupFilters={workerGroupFilters}
              onWorkerGroupFiltersChange={setWorkerGroupFilters}
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
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-4">
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
                      {searchQuery || roleFilters.length > 0 || locationFilters.length > 0 || certificateFilters.length > 0 || departmentFilters.length > 0 || availabilityDateRange?.from || workerGroupFilters.length > 0
                        ? 'No personnel found matching your filters'
                        : 'No personnel yet. Add your first team member to get started.'}
                    </p>
                  </div>
                )}
              </>
            )}
          </TabsContent>
          
          <TabsContent value="overview" className="mt-6 space-y-6">
            <ComplianceSnapshot 
              personnel={personnel}
              personnelFilter={complianceFilter}
              onPersonnelFilterChange={setComplianceFilter}
              customPersonnelIds={customFilterPersonnelIds}
              customRoles={customFilterRoles}
              customWorkerGroupIds={customFilterWorkerGroupIds}
              onCustomFilterChange={(ids, roles, workerGroupIds) => {
                setCustomFilterPersonnelIds(ids);
                setCustomFilterRoles(roles);
                setCustomFilterWorkerGroupIds(workerGroupIds);
              }}
            />
            <ExpiryTimeline 
              personnel={personnel} 
              personnelFilter={complianceFilter}
              customPersonnelIds={customFilterPersonnelIds}
              customRoles={customFilterRoles}
              customWorkerGroupIds={customFilterWorkerGroupIds}
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
                <Button variant="ghost" size="icon" onClick={() => { setSettingsOpen(false); setSettingsDeepLink(null); }}>
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
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-4 rounded-lg border border-border/50 bg-card hover:bg-muted/50 transition-colors group">
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
                    <CollapsibleTrigger className="flex items-center justify-between w-full p-4 rounded-lg border border-border/50 bg-card hover:bg-muted/50 transition-colors group">
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
                </div>

                {/* GROUP 2: ACCESS & TEAM */}
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-4 pb-1">Access & Team</p>

                <Collapsible>
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-4 rounded-lg border border-border/50 bg-card hover:bg-muted/50 transition-colors group">
                    <div className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-primary" />
                      <span className="font-semibold text-lg">Team & Admins</span>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <AdminOverview />
                  </CollapsibleContent>
                </Collapsible>

                <Collapsible>
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-4 rounded-lg border border-border/50 bg-card hover:bg-muted/50 transition-colors group">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-primary" />
                      <span className="font-semibold text-lg">Company</span>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="p-4">
                      <CompanyCard isAdmin mode="inline" onClose={() => refetchBusiness()} />
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* GROUP 3: COMPLIANCE CONFIGURATION */}
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-4 pb-1">Compliance Configuration</p>

                <Collapsible defaultOpen={settingsDeepLink === 'review-queue'}>
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-4 rounded-lg border border-border/50 bg-card hover:bg-muted/50 transition-colors group">
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
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-4 rounded-lg border border-border/50 bg-card hover:bg-muted/50 transition-colors group">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-primary" />
                      <span className="font-semibold text-lg">Locations</span>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <LocationStandardizationTool />
                  </CollapsibleContent>
                </Collapsible>

                {/* GROUP 4: PRIVACY & TOOLS */}
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-4 pb-1">Privacy & Tools</p>

                <Collapsible>
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-4 rounded-lg border border-border/50 bg-card hover:bg-muted/50 transition-colors group">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      <span className="font-semibold text-lg">Privacy & Data</span>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <DataAcknowledgementsManager
                      embedded
                      personnel={personnel}
                      businessId={profile?.business_id ?? undefined}
                      onPersonnelClick={(person) => {
                        setSettingsOpen(false);
                        setSelectedPersonnel(person);
                      }}
                    />
                  </CollapsibleContent>
                </Collapsible>

                <Collapsible>
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-4 rounded-lg border border-border/50 bg-card hover:bg-muted/50 transition-colors group">
                    <div className="flex items-center gap-2">
                      <Link2 className="h-5 w-5 text-primary" />
                      <span className="font-semibold text-lg">Freelancer Registration</span>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <RegistrationLinkCard embedded />
                  </CollapsibleContent>
                </Collapsible>

                {/* GROUP 5: SUPPORT */}
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-4 pb-1">Support</p>

                <Collapsible open={feedbackOpen} onOpenChange={setFeedbackOpen}>
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-4 rounded-lg border border-border/50 bg-card hover:bg-muted/50 transition-colors group">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-primary" />
                      <span className="font-semibold text-lg">Feedback</span>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <FeedbackList embedded open={feedbackOpen} />
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
