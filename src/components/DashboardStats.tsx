import { Card, CardContent } from '@/components/ui/card';
import { Personnel } from '@/types';
import { getPersonnelOverallStatus } from '@/lib/certificateUtils';
import { Users, CheckCircle, AlertTriangle, XCircle, FileSearch, ChevronRight } from 'lucide-react';

type ComplianceStatus = 'valid' | 'expiring' | 'expired';

interface DashboardStatsProps {
  personnel: Personnel[];
  needsReviewCount?: number;
  onNeedsReviewClick?: () => void;
  onStatClick?: (status: ComplianceStatus) => void;
}

export function DashboardStats({ personnel, needsReviewCount = 0, onNeedsReviewClick, onStatClick }: DashboardStatsProps) {
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

  const stats: { label: string; value: number; status: ComplianceStatus; icon: typeof CheckCircle; iconBg: string; iconColor: string }[] = [
    {
      label: 'All Valid',
      value: personnelByStatus.valid,
      status: 'valid',
      icon: CheckCircle,
      iconBg: 'bg-[hsl(var(--status-valid))]/10',
      iconColor: 'text-[hsl(var(--status-valid))]',
    },
    {
      label: 'Expiring Soon',
      value: personnelByStatus.expiring,
      status: 'expiring',
      icon: AlertTriangle,
      iconBg: 'bg-[hsl(var(--status-warning))]/10',
      iconColor: 'text-[hsl(var(--status-warning))]',
    },
    {
      label: 'Expired',
      value: personnelByStatus.expired,
      status: 'expired',
      icon: XCircle,
      iconBg: 'bg-destructive/10',
      iconColor: 'text-destructive',
    },
  ];

  const reviewIcon = needsReviewCount === 0 ? CheckCircle : FileSearch;
  const reviewIconBg = needsReviewCount === 0 ? 'bg-[hsl(var(--status-valid))]/10' : 'bg-amber-500/10';
  const reviewIconColor = needsReviewCount === 0 ? 'text-[hsl(var(--status-valid))]' : 'text-amber-500';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {/* Personnel & Freelancers combined card — static, no hover */}
      <Card className="border-border/50">
        <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-2">
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
        <Card
          key={stat.label}
          className="border-border/50 cursor-pointer hover:shadow-lg hover:-translate-y-0.5 hover:ring-2 hover:ring-[#C4B5FD] hover:shadow-[#C4B5FD]/20 transition-all duration-200"
          onClick={() => onStatClick?.(stat.status)}
        >
          <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-2 relative">
            <div className={`p-2.5 rounded-lg ${stat.iconBg}`}>
              <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground whitespace-nowrap">{stat.label}</p>
            </div>
            <ChevronRight className="absolute top-2 right-2 h-4 w-4 text-muted-foreground/50" />
          </CardContent>
        </Card>
      ))}

      {/* Needs Review card */}
      <Card
        className={`bg-[#C4B5FD]/10 border-[#C4B5FD]/50 ${onNeedsReviewClick ? 'cursor-pointer hover:shadow-lg hover:-translate-y-0.5 hover:ring-2 hover:ring-[#C4B5FD] hover:shadow-[#C4B5FD]/20 transition-all duration-200' : ''}`}
        onClick={onNeedsReviewClick}
      >
        <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-2 relative">
          <div className={`p-2.5 rounded-lg ${reviewIconBg}`}>
            {reviewIcon === CheckCircle ? (
              <CheckCircle className={`h-5 w-5 ${reviewIconColor}`} />
            ) : (
              <FileSearch className={`h-5 w-5 ${reviewIconColor}`} />
            )}
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{needsReviewCount}</p>
            <p className="text-xs text-muted-foreground whitespace-nowrap">To Review</p>
          </div>
          {onNeedsReviewClick && <ChevronRight className="absolute top-2 right-2 h-4 w-4 text-muted-foreground/50" />}
        </CardContent>
      </Card>
    </div>
  );
}
