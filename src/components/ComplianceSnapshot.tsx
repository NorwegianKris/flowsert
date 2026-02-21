import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Personnel } from '@/types';
import { getCertificateStatus } from '@/lib/certificateUtils';
import { Award, XCircle, CheckCircle, Users, SlidersHorizontal } from 'lucide-react';
import { CustomPersonnelFilterDialog } from './CustomPersonnelFilterDialog';
import { Badge } from '@/components/ui/badge';
import { usePersonnelWorkerGroups } from '@/hooks/usePersonnelWorkerGroups';

interface ComplianceSnapshotProps {
  personnel: Personnel[];
  personnelFilter: 'all' | 'employees' | 'freelancers' | 'custom';
  onPersonnelFilterChange: (filter: 'all' | 'employees' | 'freelancers' | 'custom') => void;
  customPersonnelIds?: string[];
  customRoles?: string[];
  customWorkerGroupIds?: string[];
  onCustomFilterChange?: (personnelIds: string[], roles: string[], workerGroupIds: string[]) => void;
}

export function ComplianceSnapshot({ 
  personnel, 
  personnelFilter,
  onPersonnelFilterChange,
  customPersonnelIds = [],
  customRoles = [],
  customWorkerGroupIds = [],
  onCustomFilterChange,
}: ComplianceSnapshotProps) {
  const [customDialogOpen, setCustomDialogOpen] = useState(false);
  const { data: personnelWorkerGroups = [] } = usePersonnelWorkerGroups();

  // Resolve worker group membership to personnel IDs
  const workerGroupPersonnelIds = useMemo(() => {
    if (customWorkerGroupIds.length === 0) return new Set<string>();
    const groupSet = new Set(customWorkerGroupIds);
    return new Set(
      personnelWorkerGroups
        .filter(pwg => groupSet.has(pwg.worker_group_id))
        .map(pwg => pwg.personnel_id)
    );
  }, [customWorkerGroupIds, personnelWorkerGroups]);

  // Filter personnel based on the selected filter
  const filteredPersonnel = useMemo(() => {
    if (personnelFilter === 'all') return personnel;
    if (personnelFilter === 'employees') return personnel.filter(p => p.category === 'employee');
    if (personnelFilter === 'freelancers') return personnel.filter(p => p.category === 'freelancer');
    if (personnelFilter === 'custom') {
      return personnel.filter(p => 
        customPersonnelIds.includes(p.id) || 
        customRoles.includes(p.role) ||
        workerGroupPersonnelIds.has(p.id)
      );
    }
    return personnel;
  }, [personnel, personnelFilter, customPersonnelIds, customRoles, workerGroupPersonnelIds]);

  // Calculate certificate metrics
  const metrics = useMemo(() => {
    let total = 0;
    let valid = 0;
    let expired = 0;

    filteredPersonnel.forEach(p => {
      p.certificates.forEach(cert => {
        total++;
        const status = getCertificateStatus(cert.expiryDate);

        if (status === 'expired') {
          expired++;
        } else if (status === 'valid') {
          valid++;
        }
      });
    });

    return { total, valid, expired };
  }, [filteredPersonnel]);

  const stats = [
    {
      label: 'Total Certificates',
      value: metrics.total,
      icon: Award,
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
    },
    {
      label: 'Valid',
      value: metrics.valid,
      icon: CheckCircle,
      iconBg: 'bg-[hsl(var(--status-valid))]/10',
      iconColor: 'text-[hsl(var(--status-valid))]',
    },
    {
      label: 'Expired',
      value: metrics.expired,
      icon: XCircle,
      iconBg: 'bg-destructive/10',
      iconColor: 'text-destructive',
    },
  ];

  const handleCustomClick = () => {
    if (personnelFilter === 'custom') {
      setCustomDialogOpen(true);
    } else {
      onPersonnelFilterChange('custom');
      setCustomDialogOpen(true);
    }
  };

  const handleApplyCustomFilter = (personnelIds: string[], roles: string[], workerGroupIds: string[]) => {
    onCustomFilterChange?.(personnelIds, roles, workerGroupIds);
    if (personnelIds.length === 0 && roles.length === 0 && workerGroupIds.length === 0) {
      onPersonnelFilterChange('employees');
    }
  };

  const customSelectionCount = customPersonnelIds.length + customRoles.length + customWorkerGroupIds.length;

  return (
    <>
      <Card className="border-border/50">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {/* Main metrics */}
            <div className="flex flex-wrap items-center gap-4 flex-1">
              {stats.map((stat) => (
                <div 
                  key={stat.label} 
                  className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-card"
                >
                  <div className={`p-2 rounded-lg ${stat.iconBg}`}>
                    <stat.icon className={`h-4 w-4 ${stat.iconColor}`} />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Personnel Filter Toggle - far right */}
            <ToggleGroup 
              type="single" 
              value={personnelFilter} 
              onValueChange={(value) => {
                if (value === 'custom') {
                  handleCustomClick();
                } else if (value) {
                  onPersonnelFilterChange(value as 'all' | 'employees' | 'freelancers' | 'custom');
                }
              }}
              className="bg-primary p-1 rounded-lg shrink-0"
            >
              <ToggleGroupItem 
                value="all" 
                aria-label="All personnel"
                className="text-white data-[state=on]:bg-background data-[state=on]:text-primary data-[state=on]:shadow-sm px-3 py-1.5 text-sm"
              >
                <Users className="h-4 w-4 mr-1.5" />
                All
              </ToggleGroupItem>
              <ToggleGroupItem 
                value="employees" 
                aria-label="Employees only"
                className="text-white data-[state=on]:bg-background data-[state=on]:text-primary data-[state=on]:shadow-sm px-3 py-1.5 text-sm"
              >
                Employees
              </ToggleGroupItem>
              <ToggleGroupItem 
                value="freelancers" 
                aria-label="Freelancers only"
                className="text-white data-[state=on]:bg-background data-[state=on]:text-primary data-[state=on]:shadow-sm px-3 py-1.5 text-sm"
              >
                Freelancers
              </ToggleGroupItem>
              <ToggleGroupItem 
                value="custom" 
                aria-label="Custom filter"
                className="text-white data-[state=on]:bg-background data-[state=on]:text-primary data-[state=on]:shadow-sm px-3 py-1.5 text-sm gap-1.5"
                onClick={(e) => {
                  if (personnelFilter === 'custom') {
                    e.preventDefault();
                    setCustomDialogOpen(true);
                  }
                }}
              >
                <SlidersHorizontal className="h-4 w-4" />
                Custom
                {personnelFilter === 'custom' && customSelectionCount > 0 && (
                  <Badge variant="secondary" className="h-5 px-1.5 text-xs ml-1">
                    {customSelectionCount}
                  </Badge>
                )}
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </CardContent>
      </Card>

      <CustomPersonnelFilterDialog
        open={customDialogOpen}
        onOpenChange={setCustomDialogOpen}
        personnel={personnel}
        selectedPersonnelIds={customPersonnelIds}
        selectedRoles={customRoles}
        selectedWorkerGroupIds={customWorkerGroupIds}
        onApply={handleApplyCustomFilter}
      />
    </>
  );
}
