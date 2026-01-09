import { useState, useMemo } from 'react';
import { DashboardHeader } from '@/components/DashboardHeader';
import { DashboardStats } from '@/components/DashboardStats';
import { PersonnelCard } from '@/components/PersonnelCard';
import { PersonnelDetail } from '@/components/PersonnelDetail';
import { ChatBot } from '@/components/ChatBot';
import { mockPersonnel } from '@/data/mockData';
import { Personnel } from '@/types';

const Index = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPersonnel, setSelectedPersonnel] = useState<Personnel | null>(null);

  const filteredPersonnel = useMemo(() => {
    if (!searchQuery.trim()) return mockPersonnel;
    
    const query = searchQuery.toLowerCase();
    return mockPersonnel.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.role.toLowerCase().includes(query) ||
        p.location.toLowerCase().includes(query) ||
        p.certificates.some((c) => c.name.toLowerCase().includes(query))
    );
  }, [searchQuery]);

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
        <DashboardStats personnel={mockPersonnel} />
        
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">
              Personnel ({filteredPersonnel.length})
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredPersonnel.map((personnel) => (
              <PersonnelCard
                key={personnel.id}
                personnel={personnel}
                onClick={() => setSelectedPersonnel(personnel)}
              />
            ))}
          </div>
          
          {filteredPersonnel.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                No personnel found matching "{searchQuery}"
              </p>
            </div>
          )}
        </div>
      </main>
      
      <ChatBot />
    </div>
  );
};

export default Index;
