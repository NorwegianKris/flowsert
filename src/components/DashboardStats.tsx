import { Card, CardContent } from '@/components/ui/card';
import { Personnel } from '@/types';
import { getPersonnelOverallStatus } from '@/lib/certificateUtils';
import { Users, CheckCircle, AlertTriangle, XCircle, FileSearch } from 'lucide-react';

interface DashboardStatsProps {
  personnel: Personnel[];
  needsReviewCount?: number;
  onNeedsReviewClick?: () => void;
}

export function DashboardStats({ personnel, needsReviewCount = 0, onNeedsReviewClick }: DashboardStatsProps) {
  // Split counts: Employees = category='employee', Freelancers = category='freelancer'
  const employeeCount = personnel.filter(p => p.category === 'employee').length;
  const freelancerCount = personnel.filter(p => p.category === 'freelancer').length;

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
      label: 'All Valid Profiles',
      value: personnelByStatus.valid,
      icon: CheckCircle,
      iconBg: 'bg-[hsl(var(--status-valid))]/10',
      iconColor: 'text-[hsl(var(--status-valid))]',
    },
    {
      label: 'Profiles Expiring Soon',
      value: personnelByStatus.expiring,
      icon: AlertTriangle,
      iconBg: 'bg-[hsl(var(--status-warning))]/10',
      iconColor: 'text-[hsl(var(--status-warning))]',
      tinted: true,
    },
    {
      label: 'Profiles Expired',
      value: personnelByStatus.expired,
      icon: XCircle,
      iconBg: 'bg-destructive/10',
      iconColor: 'text-destructive',
      tinted: true,
    },
  ];

  const reviewIcon = needsReviewCount === 0 ? CheckCircle : FileSearch;
  const reviewIconBg = needsReviewCount === 0 ? 'bg-[hsl(var(--status-valid))]/10' : 'bg-amber-500/10';
  const reviewIconColor = needsReviewCount === 0 ? 'text-[hsl(var(--status-valid))]' : 'text-amber-500';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {/* Personnel & Freelancers combined card */}
      <Card className="border-border/50">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary/10">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div className="flex gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{employeeCount}</p>
              <p className="text-xs text-muted-foreground">Employees</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{freelancerCount}</p>
              <p className="text-xs text-muted-foreground">Freelancers</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {stats.map((stat) => (
        <Card key={stat.label} className={`border-border/50 ${stat.tinted ? 'bg-[#C4B5FD]/10 border-[#C4B5FD]/50' : ''}`}>
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

      {/* Needs Review card */}
      <Card
        className={`bg-[#C4B5FD]/10 border-[#C4B5FD]/50 ${onNeedsReviewClick ? 'cursor-pointer hover:bg-[#C4B5FD]/20 transition-colors' : ''}`}
        onClick={onNeedsReviewClick}
      >
        <CardContent className="p-4 flex items-center gap-3">
          <div className={`p-2.5 rounded-lg ${reviewIconBg}`}>
            {reviewIcon === CheckCircle ? (
              <CheckCircle className={`h-5 w-5 ${reviewIconColor}`} />
            ) : (
              <FileSearch className={`h-5 w-5 ${reviewIconColor}`} />
            )}
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{needsReviewCount}</p>
            <p className="text-xs text-muted-foreground">Certificates to Review</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
