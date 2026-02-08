import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Personnel } from '@/types';
import { getCertificateStatus } from '@/lib/certificateUtils';
import { Award, XCircle, CheckCircle, Users } from 'lucide-react';

interface ComplianceSnapshotProps {
  personnel: Personnel[];
  personnelFilter: 'all' | 'employees' | 'freelancers';
  onPersonnelFilterChange: (filter: 'all' | 'employees' | 'freelancers') => void;
}

export function ComplianceSnapshot({ 
  personnel, 
  personnelFilter,
  onPersonnelFilterChange 
}: ComplianceSnapshotProps) {
  // Filter personnel based on the selected filter
  const filteredPersonnel = useMemo(() => {
    if (personnelFilter === 'all') return personnel;
    if (personnelFilter === 'employees') return personnel.filter(p => p.category === 'employee');
    if (personnelFilter === 'freelancers') return personnel.filter(p => p.category === 'freelancer');
    return personnel;
  }, [personnel, personnelFilter]);

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

  return (
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
            onValueChange={(value) => value && onPersonnelFilterChange(value as 'all' | 'employees' | 'freelancers')}
            className="bg-muted/50 p-1 rounded-lg shrink-0"
          >
            <ToggleGroupItem 
              value="all" 
              aria-label="All personnel"
              className="data-[state=on]:bg-background data-[state=on]:shadow-sm px-3 py-1.5 text-sm"
            >
              <Users className="h-4 w-4 mr-1.5" />
              All
            </ToggleGroupItem>
            <ToggleGroupItem 
              value="employees" 
              aria-label="Employees only"
              className="data-[state=on]:bg-background data-[state=on]:shadow-sm px-3 py-1.5 text-sm"
            >
              Employees
            </ToggleGroupItem>
            <ToggleGroupItem 
              value="freelancers" 
              aria-label="Freelancers only"
              className="data-[state=on]:bg-background data-[state=on]:shadow-sm px-3 py-1.5 text-sm"
            >
              Freelancers
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </CardContent>
    </Card>
  );
}
