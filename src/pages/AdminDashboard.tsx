import { useState, useMemo, useEffect } from 'react';
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
import { DataAcknowledgementsManager } from '@/components/DataAcknowledgementsManager';
import { LocationStandardizationTool } from '@/components/LocationStandardizationTool';

import { RegistrationLinkCard } from '@/components/RegistrationLinkCard';
import { AdminOverview } from '@/components/AdminOverview';
import { PersonnelOverview } from '@/components/PersonnelOverview';
import { FeedbackList } from '@/components/FeedbackList';
import { PersonnelFilters, PersonnelSortOption, CertificateFilterMode } from '@/components/PersonnelFilters';
import { useCertificateCategories } from '@/hooks/useCertificateCategories';
import { AIPersonnelSuggestions } from '@/components/AIPersonnelSuggestions';
import { FreelancerFilters } from '@/components/FreelancerFilters';
import { usePersonnel } from '@/hooks/usePersonnel';
import { useProjects, Project } from '@/hooks/useProjects';
import { usePersonnelAvailability } from '@/hooks/usePersonnelAvailability';
import { useBusinessInfo } from '@/hooks/useBusinessInfo';
import { useUnreadDirectMessages } from '@/hooks/useUnreadDirectMessages';
import { useAuth } from '@/contexts/AuthContext';
import { Personnel } from '@/types';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, LogOut, Plus, Users, LayoutDashboard, FolderOpen, Settings, Shield, Building2, Bell, Search, ChevronDown, Send, List, FileDown, MessageCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { CompanyCard } from '@/components/CompanyCard';
import { SendNotificationDialog } from '@/components/SendNotificationDialog';
import { NotificationsLog } from '@/components/NotificationsLog';
import { ExternalSharingDialog } from '@/components/ExternalSharingDialog';
import { PersonnelChatSidebar } from '@/components/PersonnelChatSidebar';
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
  const [companyCardOpen, setCompanyCardOpen] = useState(false);
  const [sendNotificationOpen, setSendNotificationOpen] = useState(false);
  const [notificationsLogOpen, setNotificationsLogOpen] = useState(false);
  const [externalSharingOpen, setExternalSharingOpen] = useState(false);
  const [personnelChatOpen, setPersonnelChatOpen] = useState(false);
  
  // Filter states (arrays for multi-select)
  const [roleFilters, setRoleFilters] = useState<string[]>([]);
  const [locationFilters, setLocationFilters] = useState<string[]>([]);
  const [categoryFilters, setCategoryFilters] = useState<string[]>([]);
  const [certificateFilters, setCertificateFilters] = useState<string[]>([]);
  const [departmentFilters, setDepartmentFilters] = useState<string[]>([]);
  const [availabilityDateRange, setAvailabilityDateRange] = useState<DateRange | undefined>(undefined);
  const [includeFreelancers, setIncludeFreelancers] = useState(false);
  const [showFreelancersOnly, setShowFreelancersOnly] = useState(false);
  const [highlightedPersonnelIds, setHighlightedPersonnelIds] = useState<string[]>([]);
  const [aiFilteredPersonnelIds, setAiFilteredPersonnelIds] = useState<string[] | null>(null);
  const [adminUserIds, setAdminUserIds] = useState<Set<string>>(new Set());
  const [sortOption, setSortOption] = useState<PersonnelSortOption>('recent');
  const [certificateFilterMode, setCertificateFilterMode] = useState<CertificateFilterMode>('types');
  const [complianceFilter, setComplianceFilter] = useState<'all' | 'employees' | 'freelancers' | 'custom'>('employees');
  const [customFilterPersonnelIds, setCustomFilterPersonnelIds] = useState<string[]>([]);
  const [customFilterRoles, setCustomFilterRoles] = useState<string[]>([]);
  
  const { personnel, loading: personnelLoading, refetch } = usePersonnel();
  const { projects, loading: projectsLoading, addProject, updateProject, addCalendarItem } = useProjects();
  const { isAvailable } = usePersonnelAvailability(availabilityDateRange?.from, availabilityDateRange?.to);
  const { business, refetch: refetchBusiness } = useBusinessInfo();
  const { signOut, profile } = useAuth();
  const { unreadCounts, totalUnread, refetchCounts } = useUnreadDirectMessages();
  const { categories: certCategories } = useCertificateCategories();
  
  const loading = personnelLoading || projectsLoading;

  // Defer fetching admin user IDs until after initial render
  const [deferredReady, setDeferredReady] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setDeferredReady(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!deferredReady || !profile?.business_id) return;

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
  }, [deferredReady, profile?.business_id]);

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

  const filteredPersonnel = useMemo(() => {
    const filtered = personnel.filter((p) => {
      // AI filter takes priority - if active, only show AI-matched personnel
      if (aiFilteredPersonnelIds !== null) {
        return aiFilteredPersonnelIds.includes(p.id);
      }
      
      // Freelancer filter logic - using category
      const isFreelancer = p.category === 'freelancer';
      
      // If showing freelancers only, filter out non-freelancers
      if (showFreelancersOnly && !isFreelancer) return false;
      
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
      
      // Category filter (multi-select: fixed_employee or freelancer)
      if (categoryFilters.length > 0 && (!p.category || !categoryFilters.includes(p.category))) return false;
      
      // Certificate filter (multi-select: personnel must have ALL selected certificates/categories)
      if (certificateFilters.length > 0) {
        if (certificateFilterMode === 'categories') {
          // Filter by certificate categories
          const personnelCategories = personnelCertificateCategoriesMap.get(p.id) || new Set<string>();
          const hasAllCategories = certificateFilters.every(cat => personnelCategories.has(cat));
          if (!hasAllCategories) return false;
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
      
      return true;
    });

    // Apply sorting
    return filtered.sort((a, b) => {
      if (sortOption === 'alphabetical') {
        return a.name.localeCompare(b.name);
      } else {
        // Most recent - sort by updatedAt or id (newest first)
        const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return dateB - dateA;
      }
    });
  }, [searchQuery, personnel, roleFilters, locationFilters, categoryFilters, certificateFilters, departmentFilters, availabilityDateRange, isAvailable, includeFreelancers, showFreelancersOnly, aiFilteredPersonnelIds, sortOption, certificateFilterMode, personnelCertificateCategoriesMap]);

  const handleProjectAdded = async (projectData: Omit<Project, 'id' | 'calendarItems'>): Promise<Project | null> => {
    return await addProject(projectData);
  };

  const handleUpdateProject = async (updatedProject: Project) => {
    const success = await updateProject(updatedProject);
    if (success) {
      setSelectedProject(updatedProject);
    }
  };

  const handleAddCalendarItem = async (projectId: string, date: string, description: string) => {
    await addCalendarItem(projectId, { date, description });
  };

  // No full-screen spinner - we render the shell immediately and show skeletons in content areas

  if (selectedPersonnel) {
    // Find the latest version of selected personnel from the list
    const currentPersonnel = personnel.find(p => p.id === selectedPersonnel.id) || selectedPersonnel;
    
    const handleBack = () => {
      if (previousProject) {
        // Go back to the project they came from
        const updatedProject = projects.find(p => p.id === previousProject.id) || previousProject;
        setSelectedPersonnel(null);
        setSelectedProject(updatedProject);
        setPreviousProject(null);
      } else {
        // Go back to dashboard
        setSelectedPersonnel(null);
      }
    };
    
    return (
      <div className="min-h-screen" style={{ backgroundImage: `url(${dashboardBgPattern})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }}>
        <DashboardHeader />
        <main className="container mx-auto px-4 py-6 bg-background shadow-lg min-h-[calc(100vh-80px)]">
          <PersonnelDetail
            personnel={currentPersonnel}
            onBack={handleBack}
            onRefresh={refetch}
            backLabel={previousProject ? `Back to ${previousProject.name}` : undefined}
          />
        </main>
        <ChatBot isAdmin />
      </div>
    );
  }

  if (selectedProject) {
    return (
      <div className="min-h-screen" style={{ backgroundImage: `url(${dashboardBgPattern})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }}>
        <DashboardHeader />
        <main className="container mx-auto px-4 py-6 bg-background shadow-lg min-h-[calc(100vh-80px)]">
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
        <ChatBot isAdmin />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundImage: `url(${dashboardBgPattern})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }}>
      <DashboardHeader />
      
      <main className="container mx-auto px-4 py-6 space-y-6 bg-background shadow-lg min-h-[calc(100vh-80px)]">
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
                <Button variant="outline" className="relative">
                  <Bell className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Actions</span>
                  <ChevronDown className="h-4 w-4 ml-1 sm:ml-2" />
                  {totalUnread > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground text-xs min-w-[18px] h-[18px] flex items-center justify-center px-1 rounded-full font-medium">
                      {totalUnread > 99 ? '99+' : totalUnread}
                    </span>
                  )}
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
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setPersonnelChatOpen(true)} className="relative">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Personnel Chat
                  {totalUnread > 0 && (
                    <span className="ml-auto bg-destructive text-destructive-foreground text-xs min-w-[18px] h-[18px] flex items-center justify-center px-1 rounded-full font-medium">
                      {totalUnread > 99 ? '99+' : totalUnread}
                    </span>
                  )}
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

        <DashboardStats personnel={personnel} />
        
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
                includeFreelancers={includeFreelancers}
                onIncludeFreelancersChange={setIncludeFreelancers}
                showFreelancersOnly={showFreelancersOnly}
                onShowFreelancersOnlyChange={setShowFreelancersOnly}
              />
            </div>
            
            <AIPersonnelSuggestions
              personnel={personnel}
              onApplyFilters={() => {}}
              onHighlightPersonnel={setHighlightedPersonnelIds}
              onClearHighlight={() => setHighlightedPersonnelIds([])}
              onIncludeFreelancersChange={setIncludeFreelancers}
              onFilterByAI={setAiFilteredPersonnelIds}
            />
            
            <PersonnelFilters
              roleFilters={roleFilters}
              onRoleFiltersChange={setRoleFilters}
              locationFilters={locationFilters}
              onLocationFiltersChange={setLocationFilters}
              categoryFilters={categoryFilters}
              onCategoryFiltersChange={setCategoryFilters}
              certificateFilters={certificateFilters}
              onCertificateFiltersChange={setCertificateFilters}
              departmentFilters={departmentFilters}
              onDepartmentFiltersChange={setDepartmentFilters}
              locations={uniqueLocations}
              certificates={uniqueCertificates}
              certificateCategories={uniqueCertificateCategories}
              availabilityDateRange={availabilityDateRange}
              onAvailabilityDateRangeChange={setAvailabilityDateRange}
              sortOption={sortOption}
              onSortOptionChange={setSortOption}
              certificateFilterMode={certificateFilterMode}
              onCertificateFilterModeChange={setCertificateFilterMode}
            />
            
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
                      {searchQuery || roleFilters.length > 0 || locationFilters.length > 0 || categoryFilters.length > 0 || certificateFilters.length > 0 || departmentFilters.length > 0 || availabilityDateRange?.from
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
              onCustomFilterChange={(ids, roles) => {
                setCustomFilterPersonnelIds(ids);
                setCustomFilterRoles(roles);
              }}
            />
            <ExpiryTimeline 
              personnel={personnel} 
              personnelFilter={complianceFilter}
              customPersonnelIds={customFilterPersonnelIds}
              customRoles={customFilterRoles}
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
                <Button variant="ghost" size="icon" onClick={() => setSettingsOpen(false)}>
                  <span className="sr-only">Close</span>
                  ✕
                </Button>
              </div>
              <div className="p-4 overflow-y-auto h-[calc(100vh-65px)] space-y-6">
                {/* Company Card Button */}
                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-2"
                  onClick={() => {
                    setSettingsOpen(false);
                    setCompanyCardOpen(true);
                  }}
                >
                  <Building2 className="h-4 w-4" />
                  Company Card
                </Button>
                
                <Tabs defaultValue="admins" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-4">
                    <TabsTrigger value="admins" className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Admins
                    </TabsTrigger>
                    <TabsTrigger value="personnel" className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Personnel
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="admins">
                    <AdminOverview />
                  </TabsContent>
                  
                  <TabsContent value="personnel">
                    <PersonnelOverview 
                      personnel={personnel} 
                      onEditPersonnel={(person) => {
                        setSettingsOpen(false);
                        setSelectedPersonnel(person);
                      }}
                      onPersonnelRemoved={refetch}
                    />
                  </TabsContent>
                </Tabs>
                
                <CategoriesSection />

                <LocationStandardizationTool />

                <DataAcknowledgementsManager
                  personnel={personnel}
                  businessId={profile?.business_id ?? undefined}
                  onPersonnelClick={(person) => {
                    setSettingsOpen(false);
                    setSelectedPersonnel(person);
                  }}
                />
                
                <RegistrationLinkCard />
                
                <FeedbackList />
              </div>
            </div>
          </div>
        )}

        {companyCardOpen && (
          <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
            <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-background border-l shadow-lg">
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Company Card
                </h2>
                <Button variant="ghost" size="icon" onClick={() => setCompanyCardOpen(false)}>
                  <span className="sr-only">Close</span>
                  ✕
                </Button>
              </div>
              <div className="p-4 overflow-y-auto h-[calc(100vh-65px)]">
                <CompanyCard isAdmin onClose={() => {
                  setCompanyCardOpen(false);
                  refetchBusiness();
                }} />
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

        <PersonnelChatSidebar
          open={personnelChatOpen}
          onOpenChange={setPersonnelChatOpen}
          unreadCounts={unreadCounts}
          onMessagesRead={refetchCounts}
        />
    </div>
  );
}
