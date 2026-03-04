import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Personnel } from '@/types';
import { getCertificateStatus } from '@/lib/certificateUtils';
import { Award, XCircle, CheckCircle, AlertTriangle } from 'lucide-react';

interface ComplianceSnapshotProps {
  personnel: Personnel[];
}

export function ComplianceSnapshot({ personnel }: ComplianceSnapshotProps) {
  // Calculate certificate metrics
  const metrics = useMemo(() => {
    let total = 0;
    let valid = 0;
    let expiring = 0;
    let expired = 0;

    personnel.forEach(p => {
      p.certificates.forEach(cert => {
        total++;
        const status = getCertificateStatus(cert.expiryDate);

        if (status === 'expired') {
          expired++;
        } else if (status === 'expiring') {
          expiring++;
        } else if (status === 'valid') {
          valid++;
        }
      });
    });

    return { total, valid, expiring, expired };
  }, [personnel]);

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
      label: 'Expiring Soon',
      value: metrics.expiring,
      icon: AlertTriangle,
      iconBg: 'bg-amber-500/10',
      iconColor: 'text-amber-500',
    },
    {
      label: 'Expired',
      value: metrics.expired,
      icon: XCircle,
      iconBg: 'bg-destructive/10',
      iconColor: 'text-destructive',
      tinted: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
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
    </div>
  );
}
