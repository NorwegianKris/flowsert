import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Personnel } from '@/types';
import { getCertificateStatus, getDaysUntilExpiry } from '@/lib/certificateUtils';
import { ShieldCheck, Award, AlertTriangle, XCircle, CheckCircle, Users } from 'lucide-react';

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
    let expiring30 = 0;
    let expiring60 = 0;
    let expiring90 = 0;

    filteredPersonnel.forEach(p => {
      p.certificates.forEach(cert => {
        total++;
        const status = getCertificateStatus(cert.expiryDate);
        const daysUntil = getDaysUntilExpiry(cert.expiryDate);

        if (status === 'expired') {
          expired++;
        } else if (status === 'valid') {
          valid++;
        }

        // Count expiring soon certificates (not yet expired)
        if (daysUntil !== null && daysUntil >= 0) {
          if (daysUntil <= 30) expiring30++;
          if (daysUntil <= 60) expiring60++;
          if (daysUntil <= 90) expiring90++;
        }
      });
    });

    return { total, valid, expired, expiring30, expiring60, expiring90 };
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

  const expiringStats = [
    { label: '≤30 days', value: metrics.expiring30 },
    { label: '≤60 days', value: metrics.expiring60 },
    { label: '≤90 days', value: metrics.expiring90 },
  ];

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Compliance Snapshot
          </CardTitle>

          {/* Personnel Filter Toggle */}
          <ToggleGroup 
            type="single" 
            value={personnelFilter} 
            onValueChange={(value) => value && onPersonnelFilterChange(value as 'all' | 'employees' | 'freelancers')}
            className="bg-muted/50 p-1 rounded-lg"
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
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* Main metrics */}
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

          {/* Expiring soon metrics */}
          <div className="col-span-2 sm:col-span-3 lg:col-span-3 flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-card">
            <div className="p-2 rounded-lg bg-[hsl(var(--status-warning))]/10">
              <AlertTriangle className="h-4 w-4 text-[hsl(var(--status-warning))]" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground mb-1.5">Expiring Soon</p>
              <div className="flex items-center gap-3">
                {expiringStats.map((stat) => (
                  <div key={stat.label} className="flex items-center gap-1.5">
                    <Badge 
                      variant={stat.value > 0 ? "secondary" : "outline"}
                      className="font-semibold"
                    >
                      {stat.value}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{stat.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
