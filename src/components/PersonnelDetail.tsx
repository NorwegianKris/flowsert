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
import { EditPersonnelDialog } from '@/components/EditPersonnelDialog';
import { AssignedProjects } from '@/components/AssignedProjects';
import { WorkerProjectDetail } from '@/components/WorkerProjectDetail';
import { Personnel } from '@/types';
import { Project } from '@/hooks/useProjects';
import { usePersonnel } from '@/hooks/usePersonnel';
import {
  getPersonnelOverallStatus,
  countCertificatesByStatus,
} from '@/lib/certificateUtils';
import { 
  ArrowLeft, MapPin, Mail, Phone, FileCheck, AlertTriangle, CheckCircle, Plus, Trash2,
  User, Globe, Home, CreditCard, Languages, Pencil, Users
} from 'lucide-react';

interface PersonnelDetailProps {
  personnel: Personnel;
  onBack: () => void;
  hideBackButton?: boolean;
  onRefresh?: () => void;
  backLabel?: string;
}

export function PersonnelDetail({ personnel, onBack, hideBackButton = false, onRefresh, backLabel }: PersonnelDetailProps) {
  const [isAddCertOpen, setIsAddCertOpen] = useState(false);
  const [isRemoveCertOpen, setIsRemoveCertOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  
  // Get all personnel for the project detail view
  const { personnel: allPersonnel } = usePersonnel();
  
  const overallStatus = getPersonnelOverallStatus(personnel);
  const certificateCounts = countCertificatesByStatus(personnel.certificates);
  
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

      <Card className="border-border/50">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-start gap-6">
            <Avatar className="h-24 w-24 border-4 border-border">
              {personnel.avatarUrl && (
                <AvatarImage src={personnel.avatarUrl} alt={personnel.name} />
              )}
              <AvatarFallback className="bg-primary/10 text-primary font-bold text-2xl">
                {initials}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 space-y-4">
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

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span>{personnel.location}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4 text-primary" />
                  <span>{personnel.email}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4 text-primary" />
                  <span>{personnel.phone}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Certificate Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <FileCheck className="h-5 w-5 text-primary" />
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

      {/* Certificates Table */}
      <Card className="border-border/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold">Certificates</CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddCertOpen(true)}
              className="gap-1"
            >
              <Plus className="h-4 w-4" />
              Add
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
          <CertificateTable certificates={personnel.certificates} onCertificateUpdated={handleCertificateChange} />
        </CardContent>
      </Card>

      {/* Personal Info + Next of Kin on left, Calendar on right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information Section */}
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between py-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
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
                  <p className="text-xs text-muted-foreground">Postal Address</p>
                  <p className="text-sm font-medium text-foreground truncate">{personnel.postalAddress || '—'}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="text-sm font-medium text-foreground truncate">{personnel.phone}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm font-medium text-foreground truncate">{personnel.email}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">Norwegian ID</p>
                  <p className="text-sm font-medium text-foreground truncate">{personnel.nationalId || '—'}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">Salary Account</p>
                  <p className="text-sm font-medium text-foreground truncate">{personnel.salaryAccountNumber || '—'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Next of Kin Section */}
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between py-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
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

          {/* Assigned Projects Section */}
          <AssignedProjects personnelId={personnel.id} onProjectClick={handleProjectClick} />
        </div>
        
        <div>
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

      <EditPersonnelDialog
        open={isEditProfileOpen}
        onOpenChange={setIsEditProfileOpen}
        personnel={personnel}
        onSuccess={handleProfileUpdate}
      />
    </div>
  );
}
