import { cn } from '@/lib/utils';
import { CertificateStatus } from '@/types';

interface StatusBadgeProps {
  status: CertificateStatus;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const statusConfig: Record<CertificateStatus, { label: string; className: string }> = {
  valid: {
    label: 'Valid',
    className: 'bg-[hsl(var(--status-valid))] text-[hsl(var(--status-valid-foreground))]',
  },
  expiring: {
    label: 'Expiring Soon',
    className: 'bg-[hsl(var(--status-warning))] text-[hsl(var(--status-warning-foreground))]',
  },
  expired: {
    label: 'Expired',
    className: 'bg-[hsl(var(--status-expired))] text-[hsl(var(--status-expired-foreground))]',
  },
};

const sizeConfig = {
  sm: 'h-2 w-2',
  md: 'h-3 w-3',
  lg: 'h-4 w-4',
};

export function StatusBadge({ status, showLabel = false, size = 'md' }: StatusBadgeProps) {
  const config = statusConfig[status];

  if (showLabel) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
          config.className
        )}
      >
        <span className={cn('rounded-full', sizeConfig[size], config.className)} />
        {config.label}
      </span>
    );
  }

  return (
    <span
      className={cn('inline-block rounded-full', sizeConfig[size], config.className)}
      title={config.label}
    />
  );
}
