import { useAuth } from '@/contexts/AuthContext';
import dashboardBgPattern from '@/assets/dashboard-bg-pattern.png';
import { useWorkerPersonnel } from '@/hooks/usePersonnel';
import { PersonnelDetail } from '@/components/PersonnelDetail';
import { WorkerInvitations } from '@/components/WorkerInvitations';
import { ChatBot } from '@/components/ChatBot';
import { ReportFeedbackDialog } from '@/components/ReportFeedbackDialog';
import { WelcomeDialog } from '@/components/WelcomeDialog';
import { ProfileCompletionIndicator } from '@/components/ProfileCompletionIndicator';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, LogOut, User } from 'lucide-react';
import { Logo } from '@/components/Logo';

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
    <div className="min-h-screen" style={{ backgroundImage: `url(${dashboardBgPattern})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }}>
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Logo />
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={personnel?.avatarUrl || ''} alt={personnel?.name || 'Profile'} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {personnel?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || <User className="h-5 w-5" />}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="font-semibold text-foreground">My Profile</h1>
                <p className="text-sm text-muted-foreground">
                  {personnel?.name || profile?.full_name || profile?.email}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {personnel && <ReportFeedbackDialog />}
            <Button variant="outline" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-6 space-y-6 bg-background shadow-lg min-h-[calc(100vh-80px)]">
        {personnel ? (
          <>
            {/* Welcome dialog for new workers */}
            <WelcomeDialog personnelId={personnel.id} businessId={personnel.businessId} isJobSeeker={personnel.isJobSeeker} />
            
            {/* Profile completion indicator for job seekers */}
            {personnel.isJobSeeker && (
              <ProfileCompletionIndicator personnel={personnel} />
            )}
            
            {/* Show pending invitations at the top - not for job seekers */}
            {!personnel.isJobSeeker && <WorkerInvitations personnelId={personnel.id} />}
            
            <PersonnelDetail
              personnel={personnel}
              onBack={() => {}}
              hideBackButton
              onRefresh={refetch}
              showRequestProject={false}
              hideInvitations
              showNotificationBell
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
        
        {/* Chat bot - only for regular workers, not job seekers */}
        {personnel && !personnel.isJobSeeker && <ChatBot />}
    </div>
  );
}
