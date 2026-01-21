import { useState, useMemo } from 'react';
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
import { CertificateCategoriesManager } from '@/components/CertificateCategoriesManager';
import { DocumentCategoriesManager } from '@/components/DocumentCategoriesManager';
import { AdminOverview } from '@/components/AdminOverview';
import { PersonnelOverview } from '@/components/PersonnelOverview';
import { FeedbackList } from '@/components/FeedbackList';
import { usePersonnel } from '@/hooks/usePersonnel';
import { useProjects, Project } from '@/hooks/useProjects';
import { useAuth } from '@/contexts/AuthContext';
import { Personnel } from '@/types';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, LogOut, Plus, Users, Calendar, FolderOpen, Settings, Shield, Building2 } from 'lucide-react';
import { CompanyCard } from '@/components/CompanyCard';

export default function AdminDashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPersonnel, setSelectedPersonnel] = useState<Personnel | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [previousProject, setPreviousProject] = useState<Project | null>(null); // Track if coming from a project
  const [activeTab, setActiveTab] = useState('personnel');
  const [addPersonnelOpen, setAddPersonnelOpen] = useState(false);
  const [addProjectOpen, setAddProjectOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [companyCardOpen, setCompanyCardOpen] = useState(false);
  const { personnel, loading: personnelLoading, refetch } = usePersonnel();
  const { projects, loading: projectsLoading, addProject, updateProject, addCalendarItem } = useProjects();
  const { signOut, profile } = useAuth();
  
  const loading = personnelLoading || projectsLoading;

  const filteredPersonnel = useMemo(() => {
    if (!searchQuery.trim()) return personnel;
    
    const query = searchQuery.toLowerCase();
    return personnel.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.role.toLowerCase().includes(query) ||
        p.location.toLowerCase().includes(query) ||
        p.certificates.some((c) => c.name.toLowerCase().includes(query))
    );
  }, [searchQuery, personnel]);

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
      <div className="min-h-screen bg-background">
        <DashboardHeader
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
        <main className="container mx-auto px-4 py-6">
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
      <div className="min-h-screen bg-background">
        <DashboardHeader
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
        <main className="container mx-auto px-4 py-6">
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
    <div className="min-h-screen bg-background">
      <DashboardHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />
      
      <main className="container mx-auto px-4 py-6 space-y-6">
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
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredPersonnel.map((p) => (
                <PersonnelCard
                  key={p.id}
                  personnel={p}
                  onClick={() => setSelectedPersonnel(p)}
                />
              ))}
            </div>
            
            {filteredPersonnel.length === 0 && !loading && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  {searchQuery 
                    ? `No personnel found matching "${searchQuery}"`
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
                    <PersonnelOverview personnel={personnel} />
                  </TabsContent>
                </Tabs>
                
                <CertificateCategoriesManager />
                <DocumentCategoriesManager />
                
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
                <CompanyCard isAdmin onClose={() => setCompanyCardOpen(false)} />
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
    </div>
  );
}
