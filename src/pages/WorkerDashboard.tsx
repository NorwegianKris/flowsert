import { useAuth } from '@/contexts/AuthContext';
import { useWorkerPersonnel } from '@/hooks/usePersonnel';
import { PersonnelDetail } from '@/components/PersonnelDetail';
import { WorkerInvitations } from '@/components/WorkerInvitations';
import { ChatBot } from '@/components/ChatBot';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, LogOut, User } from 'lucide-react';

export default function WorkerDashboard() {
  const { signOut, profile } = useAuth();
  const { personnel, loading, refetch } = useWorkerPersonnel();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-semibold text-foreground">My Profile</h1>
              <p className="text-sm text-muted-foreground">
                {profile?.full_name || profile?.email}
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-6 space-y-6">
        {personnel ? (
          <>
            {/* Show pending invitations at the top */}
            <WorkerInvitations personnelId={personnel.id} />
            
            <PersonnelDetail
              personnel={personnel}
              onBack={() => {}}
              hideBackButton
              onRefresh={refetch}
              showRequestProject={false}
            />
          </>
        ) : (
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle>Profile Not Linked</CardTitle>
              <CardDescription>
                Your account is not yet linked to a personnel profile.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Please contact your administrator to link your account to your personnel record.
              </p>
            </CardContent>
          </Card>
        )}
      </main>
      
      <ChatBot />
    </div>
  );
}
