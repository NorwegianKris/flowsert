import { Card, CardContent } from '@/components/ui/card';
import { Personnel } from '@/types';
import { getPersonnelOverallStatus } from '@/lib/certificateUtils';
import { Users, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

interface DashboardStatsProps {
  personnel: Personnel[];
}

export function DashboardStats({ personnel }: DashboardStatsProps) {
  const totalPersonnel = personnel.length;
  const totalCertificates = personnel.reduce(
    (acc, p) => acc + p.certificates.length,
    0
  );

  const personnelByStatus = personnel.reduce(
    (acc, p) => {
      const status = getPersonnelOverallStatus(p);
      acc[status]++;
      return acc;
    },
    { valid: 0, expiring: 0, expired: 0 }
  );

  const stats = [
    {
      label: 'Total Personnel',
      value: totalPersonnel,
      icon: Users,
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
    },
    {
      label: 'All Valid',
      value: personnelByStatus.valid,
      icon: CheckCircle,
      iconBg: 'bg-[hsl(var(--status-valid))]/10',
      iconColor: 'text-[hsl(var(--status-valid))]',
    },
    {
      label: 'Expiring Soon',
      value: personnelByStatus.expiring,
      icon: AlertTriangle,
      iconBg: 'bg-[hsl(var(--status-warning))]/10',
      iconColor: 'text-[hsl(var(--status-warning))]',
    },
    {
      label: 'Has Expired',
      value: personnelByStatus.expired,
      icon: XCircle,
      iconBg: 'bg-destructive/10',
      iconColor: 'text-destructive',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`p-2.5 rounded-lg ${stat.iconBg}`}>
              <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
