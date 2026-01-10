import { useState, useMemo } from 'react';
import { DashboardHeader } from '@/components/DashboardHeader';
import { DashboardStats } from '@/components/DashboardStats';
import { PersonnelCard } from '@/components/PersonnelCard';
import { PersonnelDetail } from '@/components/PersonnelDetail';
import { ProjectDetail } from '@/components/ProjectDetail';
import { ChatBot } from '@/components/ChatBot';
import { InviteWorkerDialog } from '@/components/InviteWorkerDialog';
import { AddPersonnelDialog } from '@/components/AddPersonnelDialog';
import { AddProjectDialog } from '@/components/AddProjectDialog';
import { TeamCalendar } from '@/components/TeamCalendar';
import { ProjectsTab } from '@/components/ProjectsTab';
import { usePersonnel } from '@/hooks/usePersonnel';
import { useProjects, Project } from '@/hooks/useProjects';
import { useAuth } from '@/contexts/AuthContext';
import { Personnel } from '@/types';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, UserPlus, LogOut, Plus, Users, Calendar, FolderOpen } from 'lucide-react';

export default function AdminDashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPersonnel, setSelectedPersonnel] = useState<Personnel | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [previousProject, setPreviousProject] = useState<Project | null>(null); // Track if coming from a project
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [addPersonnelOpen, setAddPersonnelOpen] = useState(false);
  const [addProjectOpen, setAddProjectOpen] = useState(false);
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

  const handleProjectAdded = async (projectData: Omit<Project, 'id' | 'calendarItems'>) => {
    await addProject(projectData);
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
        <ChatBot />
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
            onBack={() => setSelectedProject(null)}
            onUpdateProject={handleUpdateProject}
            onPersonnelClick={(person) => {
              setPreviousProject(selectedProject);
              setSelectedProject(null);
              setSelectedPersonnel(person);
            }}
          />
        </main>
        <ChatBot />
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
            <Button variant="outline" onClick={() => setInviteDialogOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Invite Worker
            </Button>
            <Button variant="outline" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        <DashboardStats personnel={personnel} />
        
        <Tabs defaultValue="personnel" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="personnel" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Personnel
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Calendar
            </TabsTrigger>
            <TabsTrigger value="projects" className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
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
      </main>
      
      <ChatBot />
      
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
      
      <InviteWorkerDialog 
        open={inviteDialogOpen} 
        onOpenChange={setInviteDialogOpen}
        personnel={personnel}
        onInviteSent={refetch}
      />
    </div>
  );
}
