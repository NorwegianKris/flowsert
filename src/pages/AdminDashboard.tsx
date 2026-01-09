import { useState, useMemo } from 'react';
import { DashboardHeader } from '@/components/DashboardHeader';
import { DashboardStats } from '@/components/DashboardStats';
import { PersonnelCard } from '@/components/PersonnelCard';
import { PersonnelDetail } from '@/components/PersonnelDetail';
import { ChatBot } from '@/components/ChatBot';
import { InviteWorkerDialog } from '@/components/InviteWorkerDialog';
import { AddPersonnelDialog } from '@/components/AddPersonnelDialog';
import { TeamCalendar } from '@/components/TeamCalendar';
import { usePersonnel } from '@/hooks/usePersonnel';
import { useAuth } from '@/contexts/AuthContext';
import { Personnel } from '@/types';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Loader2, UserPlus, LogOut, Plus, ChevronDown, Users } from 'lucide-react';

export default function AdminDashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPersonnel, setSelectedPersonnel] = useState<Personnel | null>(null);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [personnelOpen, setPersonnelOpen] = useState(true);
  const [addPersonnelOpen, setAddPersonnelOpen] = useState(false);
  const { personnel, loading, refetch } = usePersonnel();
  const { signOut, profile } = useAuth();

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (selectedPersonnel) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
        <main className="container mx-auto px-4 py-6">
          <PersonnelDetail
            personnel={selectedPersonnel}
            onBack={() => setSelectedPersonnel(null)}
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
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Collapsible open={personnelOpen} onOpenChange={setPersonnelOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full flex items-center justify-between p-0 h-auto mb-4 hover:bg-transparent">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-semibold text-foreground">
                      Personnel ({filteredPersonnel.length})
                    </h2>
                  </div>
                  <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${personnelOpen ? '' : '-rotate-90'}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              </CollapsibleContent>
            </Collapsible>
          </div>
          
          <div className="lg:col-span-1">
            <TeamCalendar personnel={personnel} />
          </div>
        </div>
      </main>
      
      <ChatBot />
      
      <AddPersonnelDialog
        open={addPersonnelOpen}
        onOpenChange={setAddPersonnelOpen}
        onPersonnelAdded={refetch}
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
