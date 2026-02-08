import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/StatusBadge';
import { CertificateTable } from '@/components/CertificateTable';
import { AvailabilityCalendar } from '@/components/AvailabilityCalendar';
import { AddCertificateDialog } from '@/components/AddCertificateDialog';
import { RemoveCertificateDialog } from '@/components/RemoveCertificateDialog';
import { EditCertificateSelectDialog } from '@/components/EditCertificateSelectDialog';
import { EditPersonnelDialog } from '@/components/EditPersonnelDialog';
import { AssignedProjects } from '@/components/AssignedProjects';
import { WorkerProjectDetail } from '@/components/WorkerProjectDetail';
import { RequestProjectDialog } from '@/components/RequestProjectDialog';
import { PersonnelInvitations } from '@/components/PersonnelInvitations';
import { DirectMessageChat } from '@/components/DirectMessageChat';
import { SendProfileInvitationDialog } from '@/components/SendProfileInvitationDialog';
import { NotificationBell } from '@/components/NotificationBell';
import { ActivateProfileDialog } from '@/components/ActivateProfileDialog';
import { ProfileCompletionBar } from '@/components/ProfileCompletionBar';
import { CertificateExpiryNotificationDialog } from '@/components/CertificateExpiryNotificationDialog';
import { Personnel } from '@/types';
import { Project, useProjects } from '@/hooks/useProjects';
import { usePersonnel } from '@/hooks/usePersonnel';
import { useProjectInvitations } from '@/hooks/useProjectInvitations';
import { useAuth } from '@/contexts/AuthContext';
import {
  getPersonnelOverallStatus,
  countCertificatesByStatus,
} from '@/lib/certificateUtils';
import {
  ArrowLeft, MapPin, Mail, Phone, FileCheck, AlertTriangle, CheckCircle, Plus, Trash2,
  User, Globe, Home, CreditCard, Languages, Pencil, Users, Send, UserPlus, ShieldCheck, ShieldOff, Lock, Clock, RefreshCw, Hash
} from 'lucide-react';
import { format } from 'date-fns';
import { PersonnelDocuments } from './PersonnelDocuments';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PersonnelDetailProps {
  personnel: Personnel;
  onBack: () => void;
  hideBackButton?: boolean;
  onRefresh?: () => void;
  backLabel?: string;
  showRequestProject?: boolean;
  hideInvitations?: boolean;
  showNotificationBell?: boolean;
}

export function PersonnelDetail({ personnel, onBack, hideBackButton = false, onRefresh, backLabel, showRequestProject = true, hideInvitations = false, showNotificationBell = false }: PersonnelDetailProps) {
  const [isAddCertOpen, setIsAddCertOpen] = useState(false);
  const [isRemoveCertOpen, setIsRemoveCertOpen] = useState(false);
  const [isEditCertSelectOpen, setIsEditCertSelectOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isRequestProjectOpen, setIsRequestProjectOpen] = useState(false);
  const [isSendInvitationOpen, setIsSendInvitationOpen] = useState(false);
  const [isActivateDialogOpen, setIsActivateDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  
  const { isAdmin } = useAuth();
  
  // Get all personnel for the project detail view
  const { personnel: allPersonnel } = usePersonnel();
  const { projects } = useProjects();
  const { getInvitationsForPersonnel } = useProjectInvitations();
  
  // Get existing invitation project IDs for this personnel
  const existingInvitationProjectIds = getInvitationsForPersonnel(personnel.id).map(inv => inv.projectId);
  
  const overallStatus = getPersonnelOverallStatus(personnel);
  const certificateCounts = countCertificatesByStatus(personnel.certificates);
  const isActivated = personnel.activated || false;
  
  const handleCertificateChange = () => {
    if (onRefresh) {
      onRefresh();
    }
  };

  const handleProfileUpdate = () => {
    if (onRefresh) {
      onRefresh();
    }
  };

  const handleProjectClick = (project: Project) => {
    setSelectedProject(project);
  };

  const initials = personnel.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  // Show project detail if a project is selected
  if (selectedProject) {
    return (
      <WorkerProjectDetail
        project={selectedProject}
        personnel={allPersonnel}
        onBack={() => setSelectedProject(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        {!hideBackButton && (
          <Button
            variant="ghost"
            onClick={onBack}
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            {backLabel || 'Back to Personnel'}
          </Button>
        )}
        {hideBackButton && <div />}
        
        <div className="flex flex-wrap gap-2 justify-end">
          {/* Activate/Deactivate button for admins - only for freelancers */}
          {isAdmin && personnel.isJobSeeker && (
            <Button
              variant={isActivated ? 'outline' : 'default'}
              onClick={() => setIsActivateDialogOpen(true)}
              className="gap-1 sm:gap-2"
            >
              {isActivated ? (
                <>
                  <ShieldOff className="h-4 w-4" />
                  <span className="hidden sm:inline">Deactivate</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  <span className="hidden sm:inline">Activate Profile</span>
                </>
              )}
            </Button>
          )}
          
          {/* Show invitation button only if profile is not yet linked to a user account */}
          {showRequestProject && !personnel.userId && (
            <Button
              variant="outline"
              onClick={() => setIsSendInvitationOpen(true)}
              className="gap-1 sm:gap-2"
            >
              <UserPlus className="h-4 w-4" />
              <span className="hidden sm:inline">Send Invitation</span>
            </Button>
          )}
          
          {/* Request for Project button - only for activated profiles */}
          {showRequestProject && isActivated && (
            <Button
              onClick={() => setIsRequestProjectOpen(true)}
              className="gap-1 sm:gap-2"
            >
              <Send className="h-4 w-4" />
              <span className="hidden sm:inline">Request for Project</span>
            </Button>
          )}
        </div>
      </div>

      {/* Activation Status Banner - only for freelancers */}
      {isAdmin && personnel.isJobSeeker && !isActivated && (
        <Alert className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800">
          <Lock className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800 dark:text-amber-200">
            <strong>Profile not activated.</strong> Activate profile to unlock documents and project assignment. 
            Activated profiles count toward billing.
          </AlertDescription>
        </Alert>
      )}

      <Card className="border-border/50">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-start gap-6">
            {/* Mobile: Avatar + Metadata side by side */}
            <div className="flex gap-4 md:block">
              <Avatar className="h-24 w-24 border-4 border-border shrink-0">
                {personnel.avatarUrl && (
                  <AvatarImage src={personnel.avatarUrl} alt={personnel.name} />
                )}
                <AvatarFallback className="bg-primary/10 text-primary font-bold text-2xl">
                  {initials}
                </AvatarFallback>
              </Avatar>
              
              {/* Profile Code and Timestamps - Shown next to avatar on mobile only */}
              <div className="md:hidden space-y-1">
                <div className="flex items-center gap-1.5">
                  <Hash className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs font-mono font-semibold text-primary">
                    {personnel.profileCode || '------'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span className="text-xs">
                    {personnel.lastLoginAt 
                      ? format(new Date(personnel.lastLoginAt), 'MMM d, yyyy')
                      : 'Never logged in'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <RefreshCw className="h-3 w-3" />
                  <span className="text-xs">
                    {personnel.updatedAt 
                      ? format(new Date(personnel.updatedAt), 'MMM d, yyyy')
                      : 'Never updated'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex-1 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-2xl font-bold text-foreground">
                      {personnel.name}
                    </h1>
                    <StatusBadge status={overallStatus} showLabel size="lg" />
                  </div>
                  <Badge variant="secondary" className="text-sm font-normal">
                    {personnel.role}
                  </Badge>
                </div>
                
                {/* Profile Code and Timestamps - Top Right (hidden on mobile) */}
                <div className="hidden md:block text-right space-y-1">
                  <div className="flex items-center justify-end gap-1.5">
                    <span className="text-xs text-muted-foreground">Profile Reference Code:</span>
                    <span className="text-sm font-mono font-semibold text-primary">
                      {personnel.profileCode || '------'}
                    </span>
                  </div>
                  <div className="flex items-center justify-end gap-1.5 text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span className="text-xs">
                      {personnel.lastLoginAt 
                        ? format(new Date(personnel.lastLoginAt), 'MMM d, yyyy HH:mm')
                        : 'Never logged in'}
                    </span>
                  </div>
                  <div className="flex items-center justify-end gap-1.5 text-muted-foreground">
                    <RefreshCw className="h-3 w-3" />
                    <span className="text-xs">
                      {personnel.updatedAt 
                        ? format(new Date(personnel.updatedAt), 'MMM d, yyyy HH:mm')
                        : 'Never updated'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm flex-1">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4 text-rose-500" />
                    <span>{personnel.location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4 text-blue-500" />
                    <span>{personnel.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4 text-emerald-500" />
                    <span>{personnel.phone}</span>
                  </div>
                </div>
                {showNotificationBell && (
                  <NotificationBell personnelId={personnel.id} />
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Completion Bar */}
      <Card className="border-border/50">
        <CardContent className="py-4">
          <ProfileCompletionBar personnel={personnel} />
        </CardContent>
      </Card>

      {/* Certificate Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <FileCheck className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {personnel.certificates.length}
              </p>
              <p className="text-xs text-muted-foreground">Total Certificates</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[hsl(var(--status-valid))]/10">
              <CheckCircle className="h-5 w-5 text-[hsl(var(--status-valid))]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {certificateCounts.valid}
              </p>
              <p className="text-xs text-muted-foreground">Valid</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[hsl(var(--status-warning))]/10">
              <AlertTriangle className="h-5 w-5 text-[hsl(var(--status-warning))]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {certificateCounts.expiring}
              </p>
              <p className="text-xs text-muted-foreground">Expiring Soon</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {certificateCounts.expired}
              </p>
              <p className="text-xs text-muted-foreground">Expired</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tell me about yourself - only for freelancers/job seekers */}
      {personnel.isJobSeeker && (
        <Card className="border-border/50 border-sky-200 bg-sky-50/50">
          <CardHeader className="flex flex-row items-center justify-between py-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <User className="h-4 w-4 text-sky-500" />
              Tell me about yourself
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditProfileOpen(true)}
              className="gap-1 h-8"
            >
              <Pencil className="h-3 w-3" />
              Edit
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            {personnel.bio ? (
              <p className="text-sm text-foreground whitespace-pre-wrap">{personnel.bio}</p>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                No introduction yet. Click Edit to tell potential employers about yourself.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Certificates Table */}
      <Card className="border-border/50">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="text-lg font-semibold">Certificates</CardTitle>
          <div className="flex flex-wrap gap-2 justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddCertOpen(true)}
              className="gap-1"
            >
              <Plus className="h-4 w-4" />
              Add
            </Button>
            <CertificateExpiryNotificationDialog
              personnelId={personnel.id}
              personnelEmail={personnel.email}
              initialEnabled={personnel.certificateExpiryNotifications}
              onUpdate={onRefresh}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditCertSelectOpen(true)}
              className="gap-1"
              disabled={personnel.certificates.length === 0}
            >
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsRemoveCertOpen(true)}
              className="gap-1 text-destructive hover:text-destructive"
              disabled={personnel.certificates.length === 0}
            >
              <Trash2 className="h-4 w-4" />
              Remove
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Encouraging message for freelancers */}
          {personnel.isJobSeeker && (
            <Alert className="mb-4 bg-[#C4B5FD]/10 border-[#C4B5FD]/50">
              <FileCheck className="h-4 w-4 text-[#4338CA]" />
              <AlertDescription className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Tip:</span> Uploading certificates increases your chances of getting hired. Employers prioritize candidates with verified qualifications.
              </AlertDescription>
            </Alert>
          )}
          <CertificateTable 
            certificates={personnel.certificates} 
            onCertificateUpdated={handleCertificateChange}
            isProfileActivated={!personnel.isJobSeeker || isActivated}
          />
        </CardContent>
      </Card>

      {/* Pending Invitations Section */}
      {!hideInvitations && <PersonnelInvitations personnelId={personnel.id} />}

      {/* Assigned Projects Section - hidden for job seekers */}
      {!personnel.isJobSeeker && <AssignedProjects personnelId={personnel.id} onProjectClick={handleProjectClick} />}

      {/* Personal Info + Next of Kin + Documents on left, Chat + Calendar on right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information Section */}
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between py-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <User className="h-4 w-4 text-indigo-500" />
                Personal Information
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditProfileOpen(true)}
                className="gap-1 h-8"
              >
                <Pencil className="h-3 w-3" />
                Edit
              </Button>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">Full Name</p>
                  <p className="text-sm font-medium text-foreground truncate">{personnel.name}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">Role</p>
                  <p className="text-sm font-medium text-foreground truncate">{personnel.role}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">Nationality</p>
                  <p className="text-sm font-medium text-foreground truncate">{personnel.nationality || '—'}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">Department</p>
                  <p className="text-sm font-medium text-foreground truncate">{personnel.department || '—'}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">Gender</p>
                  <p className="text-sm font-medium text-foreground truncate">{personnel.gender || '—'}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">Language</p>
                  <p className="text-sm font-medium text-foreground truncate">{personnel.language || 'Norwegian'}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">Address</p>
                  <p className="text-sm font-medium text-foreground truncate">{personnel.address || '—'}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">Postal Code</p>
                  <p className="text-sm font-medium text-foreground truncate">{personnel.postalCode || '—'}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="text-sm font-medium text-foreground truncate">{personnel.phone}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm font-medium text-foreground truncate">{personnel.email}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Next of Kin Section - hidden for job seekers */}
          {!personnel.isJobSeeker && (
            <Card className="border-border/50">
              <CardHeader className="flex flex-row items-center justify-between py-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4 text-pink-500" />
                  Next of Kin
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditProfileOpen(true)}
                  className="gap-1 h-8"
                >
                  <Pencil className="h-3 w-3" />
                  Edit
                </Button>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">Name</p>
                    <p className="text-sm font-medium text-foreground truncate">{personnel.nextOfKinName || '—'}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">Relation</p>
                    <p className="text-sm font-medium text-foreground truncate">{personnel.nextOfKinRelation || '—'}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="text-sm font-medium text-foreground truncate">{personnel.nextOfKinPhone || '—'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Documents Section */}
          <PersonnelDocuments personnelId={personnel.id} isProfileActivated={personnel.isJobSeeker || isActivated} />
        </div>
        
        {/* Right column: Compact Chat notification + Calendar */}
        <div className="space-y-6">
          {/* Direct Messages */}
          <DirectMessageChat 
            personnelId={personnel.id} 
            personnelName={personnel.name}
          />
          
          {/* Availability Calendar */}
          <AvailabilityCalendar 
            personnelId={personnel.id} 
            personnelName={personnel.name}
            certificates={personnel.certificates}
          />
        </div>
      </div>

      <AddCertificateDialog
        open={isAddCertOpen}
        onOpenChange={setIsAddCertOpen}
        personnelId={personnel.id}
        personnelName={personnel.name}
        onSuccess={handleCertificateChange}
      />

      <RemoveCertificateDialog
        open={isRemoveCertOpen}
        onOpenChange={setIsRemoveCertOpen}
        certificates={personnel.certificates}
        personnelName={personnel.name}
        onSuccess={handleCertificateChange}
      />

      <EditCertificateSelectDialog
        open={isEditCertSelectOpen}
        onOpenChange={setIsEditCertSelectOpen}
        certificates={personnel.certificates}
        personnelName={personnel.name}
        onSuccess={handleCertificateChange}
      />

      <EditPersonnelDialog
        open={isEditProfileOpen}
        onOpenChange={setIsEditProfileOpen}
        personnel={personnel}
        onSuccess={handleProfileUpdate}
      />

      <RequestProjectDialog
        open={isRequestProjectOpen}
        onOpenChange={setIsRequestProjectOpen}
        personnelId={personnel.id}
        personnelName={personnel.name}
        personnelEmail={personnel.email}
        projects={projects}
        existingInvitations={existingInvitationProjectIds}
      />

      <SendProfileInvitationDialog
        open={isSendInvitationOpen}
        onOpenChange={setIsSendInvitationOpen}
        personnel={personnel}
        onInvitationSent={onRefresh}
      />

      <ActivateProfileDialog
        open={isActivateDialogOpen}
        onOpenChange={setIsActivateDialogOpen}
        personnelId={personnel.id}
        personnelName={personnel.name}
        isCurrentlyActivated={isActivated}
        isJobSeeker={personnel.isJobSeeker || false}
        onSuccess={() => onRefresh?.()}
      />
    </div>
  );
}
