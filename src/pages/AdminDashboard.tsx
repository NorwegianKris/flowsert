import { useState, useMemo } from 'react';
import dashboardBgPattern from '@/assets/dashboard-bg-pattern.png';
import { DashboardHeader } from '@/components/DashboardHeader';
import { DashboardStats } from '@/components/DashboardStats';
import { PersonnelCard } from '@/components/PersonnelCard';
import { PersonnelDetail } from '@/components/PersonnelDetail';
import { ProjectDetail } from '@/components/ProjectDetail';
import { ChatBot } from '@/components/ChatBot';
import { AddPersonnelDialog } from '@/components/AddPersonnelDialog';
import { AddProjectDialog } from '@/components/AddProjectDialog';
import { TeamCalendar } from '@/components/TeamCalendar';
import { ProjectsTab } from '@/components/ProjectsTab';
import { CategoriesSection } from '@/components/CategoriesSection';

import { RegistrationLinkCard } from '@/components/RegistrationLinkCard';
import { AdminOverview } from '@/components/AdminOverview';
import { PersonnelOverview } from '@/components/PersonnelOverview';
import { FeedbackList } from '@/components/FeedbackList';
import { PersonnelFilters } from '@/components/PersonnelFilters';
import { AIPersonnelSuggestions } from '@/components/AIPersonnelSuggestions';
import { JobSeekerFilters } from '@/components/JobSeekerFilters';
import { usePersonnel } from '@/hooks/usePersonnel';
import { useProjects, Project } from '@/hooks/useProjects';
import { usePersonnelAvailability } from '@/hooks/usePersonnelAvailability';
import { useBusinessInfo } from '@/hooks/useBusinessInfo';
import { useAuth } from '@/contexts/AuthContext';
import { Personnel } from '@/types';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, LogOut, Plus, Users, Calendar, FolderOpen, Settings, Shield, Building2, Bell, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { CompanyCard } from '@/components/CompanyCard';
import { SendNotificationDialog } from '@/components/SendNotificationDialog';
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
  
  // Filter states (arrays for multi-select)
  const [roleFilters, setRoleFilters] = useState<string[]>([]);
  const [locationFilters, setLocationFilters] = useState<string[]>([]);
  const [categoryFilters, setCategoryFilters] = useState<string[]>([]);
  const [certificateFilters, setCertificateFilters] = useState<string[]>([]);
  const [departmentFilters, setDepartmentFilters] = useState<string[]>([]);
  const [availabilityDateRange, setAvailabilityDateRange] = useState<DateRange | undefined>(undefined);
  const [includeJobSeekers, setIncludeJobSeekers] = useState(false);
  const [showJobSeekersOnly, setShowJobSeekersOnly] = useState(false);
  const [highlightedPersonnelIds, setHighlightedPersonnelIds] = useState<string[]>([]);
  
  const { personnel, loading: personnelLoading, refetch } = usePersonnel();
  const { projects, loading: projectsLoading, addProject, updateProject, addCalendarItem } = useProjects();
  const { isAvailable } = usePersonnelAvailability(availabilityDateRange?.from, availabilityDateRange?.to);
  const { business, refetch: refetchBusiness } = useBusinessInfo();
  const { signOut, profile } = useAuth();
  
  const loading = personnelLoading || projectsLoading;

  // Get unique locations for filter dropdown
  const uniqueLocations = useMemo(() => {
    const locations = [...new Set(personnel.map(p => p.location))].filter(Boolean).sort();
    return locations;
  }, [personnel]);

  // Get unique certificate names for filter dropdown
  const uniqueCertificates = useMemo(() => {
    const certs = new Set<string>();
    personnel.forEach(p => {
      p.certificates.forEach(c => certs.add(c.name));
    });
    return [...certs].sort();
  }, [personnel]);

  const filteredPersonnel = useMemo(() => {
    return personnel.filter((p) => {
      // Job seeker filter logic
      const isJobSeeker = p.isJobSeeker || false;
      
      // If showing job seekers only, filter out non-job seekers
      if (showJobSeekersOnly && !isJobSeeker) return false;
      
      // If not including job seekers and not showing only, exclude job seekers
      if (!includeJobSeekers && !showJobSeekersOnly && isJobSeeker) return false;
      
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
      
      // Certificate filter (multi-select: personnel must have ALL selected certificates)
      if (certificateFilters.length > 0) {
        const personnelCertNames = p.certificates.map(c => c.name);
        const hasAllCerts = certificateFilters.every(cert => personnelCertNames.includes(cert));
        if (!hasAllCerts) return false;
      }
      
      // Department filter (multi-select)
      if (departmentFilters.length > 0 && (!p.department || !departmentFilters.includes(p.department))) return false;
      
      // Availability filter
      if (availabilityDateRange?.from && !isAvailable(p.id)) return false;
      
      return true;
    });
  }, [searchQuery, personnel, roleFilters, locationFilters, categoryFilters, certificateFilters, departmentFilters, availabilityDateRange, isAvailable, includeJobSeekers, showJobSeekersOnly]);

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back, {profile?.full_name || profile?.email}
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setAddPersonnelOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Personnel
            </Button>
            <Button onClick={() => setAddProjectOpen(true)}>
              <FolderOpen className="h-4 w-4 mr-2" />
              New Project
            </Button>
            <Button variant="outline" onClick={() => setSendNotificationOpen(true)}>
              <Bell className="h-4 w-4 mr-2" />
              Send Notification
            </Button>
            <Button variant="outline" onClick={() => setCompanyCardOpen(true)}>
              <Building2 className="h-4 w-4 mr-2" />
              Company Card
            </Button>
            <Button variant="outline" onClick={() => setSettingsOpen(true)}>
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
            <Button variant="outline" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        <DashboardStats personnel={personnel} />
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-primary p-1.5 h-12">
            <TabsTrigger value="personnel" className="flex items-center gap-2 text-primary-foreground data-[state=active]:bg-primary-foreground data-[state=active]:text-primary text-base">
              <Users className="h-5 w-5" />
              Personnel
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-2 text-primary-foreground data-[state=active]:bg-primary-foreground data-[state=active]:text-primary text-base">
              <Calendar className="h-5 w-5" />
              Calendar
            </TabsTrigger>
            <TabsTrigger value="projects" className="flex items-center gap-2 text-primary-foreground data-[state=active]:bg-primary-foreground data-[state=active]:text-primary text-base">
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
              <JobSeekerFilters
                includeJobSeekers={includeJobSeekers}
                onIncludeJobSeekersChange={setIncludeJobSeekers}
                showJobSeekersOnly={showJobSeekersOnly}
                onShowJobSeekersOnlyChange={setShowJobSeekersOnly}
              />
            </div>
            
            <AIPersonnelSuggestions
              personnel={personnel}
              onApplyFilters={() => {}}
              onHighlightPersonnel={setHighlightedPersonnelIds}
              onClearHighlight={() => setHighlightedPersonnelIds([])}
              onIncludeJobSeekersChange={setIncludeJobSeekers}
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
              availabilityDateRange={availabilityDateRange}
              onAvailabilityDateRangeChange={setAvailabilityDateRange}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-4">
              {filteredPersonnel.map((p) => (
                <PersonnelCard
                  key={p.id}
                  personnel={p}
                  onClick={() => setSelectedPersonnel(p)}
                  onRemoved={refetch}
                  highlighted={highlightedPersonnelIds.includes(p.id)}
                />
              ))}
            </div>
            
            {filteredPersonnel.length === 0 && !loading && (
              <div className="text-center py-12">
                <div className="text-5xl mb-4">👤</div>
                <p className="text-muted-foreground">
                  {searchQuery || roleFilters.length > 0 || locationFilters.length > 0 || categoryFilters.length > 0 || certificateFilters.length > 0 || departmentFilters.length > 0 || availabilityDateRange?.from
                    ? 'No personnel found matching your filters'
                    : 'No personnel yet. Add your first team member to get started.'}
                </p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="calendar" className="mt-6">
            <TeamCalendar 
              personnel={personnel} 
              projects={projects} 
              onAddCalendarItem={handleAddCalendarItem}
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
            <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-background border-l shadow-lg">
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-lg font-semibold">Settings</h2>
                <Button variant="ghost" size="icon" onClick={() => setSettingsOpen(false)}>
                  <span className="sr-only">Close</span>
                  ✕
                </Button>
              </div>
              <div className="p-4 overflow-y-auto h-[calc(100vh-65px)] space-y-6">
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
    </div>
  );
}
