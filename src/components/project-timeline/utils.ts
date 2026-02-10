import { parseISO, differenceInDays } from 'date-fns';
import { ComplianceStatus } from './types';

export function dateToX(
  date: Date | string,
  projectStart: Date | string,
  projectEnd: Date | string,
  totalWidth: number
): number {
  const d = typeof date === 'string' ? parseISO(date) : date;
  const start = typeof projectStart === 'string' ? parseISO(projectStart) : projectStart;
  const end = typeof projectEnd === 'string' ? parseISO(projectEnd) : projectEnd;

  const totalDays = differenceInDays(end, start) || 1;
  const dayOffset = differenceInDays(d, start);
  return Math.round((dayOffset / totalDays) * totalWidth);
}

export function getComplianceStatus(
  expiryDate: string | null,
  projectStart: string,
  projectEnd: string
): ComplianceStatus {
  if (!expiryDate) return 'valid'; // No expiry = always valid

  const expiry = parseISO(expiryDate);
  const start = parseISO(projectStart);
  const end = parseISO(projectEnd);

  if (expiry < start) return 'expired';
  if (expiry <= end) return 'warning';
  return 'valid';
}

export function complianceColor(status: ComplianceStatus): string {
  switch (status) {
    case 'valid':
      return 'bg-emerald-500';
    case 'warning':
      return 'bg-amber-500';
    case 'expired':
      return 'bg-red-500';
  }
}

export function complianceLabel(status: ComplianceStatus): string {
  switch (status) {
    case 'valid':
      return 'Valid throughout project';
    case 'warning':
      return 'Expires during project';
    case 'expired':
      return 'Expired before project start';
  }
}
