import { useAuth } from '@/contexts/AuthContext';
import dashboardBgPattern from '@/assets/dashboard-bg-pattern.png';
import { useWorkerPersonnel } from '@/hooks/usePersonnel';
import { PersonnelDetail } from '@/components/PersonnelDetail';
import { WorkerInvitations } from '@/components/WorkerInvitations';
import { PostedProjects } from '@/components/PostedProjects';
import { ChatBot } from '@/components/ChatBot';
import { ReportFeedbackDialog } from '@/components/ReportFeedbackDialog';
import { WelcomeDialog } from '@/components/WelcomeDialog';
import { ProfileCompletionIndicator } from '@/components/ProfileCompletionIndicator';
import { Skeleton } from '@/components/ui/skeleton';
import { DataProcessingAcknowledgementDialog } from '@/components/DataProcessingAcknowledgementDialog';
import { useDataAcknowledgement } from '@/hooks/useDataAcknowledgement';
import { useBusinessInfo } from '@/hooks/useBusinessInfo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, LogOut, User } from 'lucide-react';
import { Logo } from '@/components/Logo';

export default function WorkerDashboard() {
  const { signOut, profile } = useAuth();
  const { personnel, loading, refetch } = useWorkerPersonnel();
  const { business } = useBusinessInfo();
  const {
    hasAcknowledged,
    loading: ackLoading,
    submitAcknowledgement,
  } = useDataAcknowledgement(personnel?.id, personnel?.businessId, business?.required_ack_version);

  const isInitialLoading = loading || ackLoading;

  return (
    <div className="min-h-screen" style={{ backgroundImage: `url(${dashboardBgPattern})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }}>
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="w-full max-w-[1320px] mx-auto canvas-padding py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Logo and Profile Info */}
            <div className="flex items-center gap-4">
              <Logo />
              {isInitialLoading ? (
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div>
                    <Skeleton className="h-5 w-24 mb-1" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>
              ) : (
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
              )}
            </div>
            
            {/* Action Buttons - Below on mobile, side on desktop */}
            <div className="flex items-center gap-2 sm:gap-3">
              {personnel && <ReportFeedbackDialog />}
              <Button variant="outline" onClick={signOut}>
                <LogOut className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          </div>
        </div>
      </header>
      
      <main className="w-full max-w-[1320px] mx-auto canvas-padding py-6 space-y-6 bg-background shadow-lg min-h-[calc(100vh-80px)]">
        {isInitialLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-8 w-48" />
            <div className="space-y-4">
              <Skeleton className="h-24 w-full rounded-lg" />
              <Skeleton className="h-64 w-full rounded-lg" />
              <Skeleton className="h-48 w-full rounded-lg" />
            </div>
          </div>
        ) : personnel ? (
          <>
            {/* GDPR acknowledgement dialog - blocking, only show when business is loaded */}
            {!!business && !ackLoading && (
              <DataProcessingAcknowledgementDialog
                open={!hasAcknowledged}
                companyName={business.name}
                onAcknowledge={() => submitAcknowledgement('registration')}
              />
            )}

            {/* Welcome dialog for new workers */}
            <WelcomeDialog personnelId={personnel.id} businessId={personnel.businessId} isFreelancer={personnel.category === 'freelancer'} />
            
            {/* Profile completion indicator for freelancers */}
            {personnel.category === 'freelancer' && (
              <ProfileCompletionIndicator personnel={personnel} />
            )}
            
            {/* Show pending invitations and posted projects */}
            {personnel.category !== 'freelancer' ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <WorkerInvitations personnelId={personnel.id} />
                <PostedProjects personnelId={personnel.id} businessId={personnel.businessId || ''} />
              </div>
            ) : (
              <PostedProjects personnelId={personnel.id} businessId={personnel.businessId || ''} />
            )}
            
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
        
        {/* Chat bot - only for regular workers, not freelancers */}
        {personnel && personnel.category !== 'freelancer' && <ChatBot />}
    </div>
  );
}
