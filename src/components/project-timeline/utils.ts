import { differenceInDays } from 'date-fns';
import { ComplianceStatus } from './types';

/** Parse a YYYY-MM-DD string as a local date (not UTC) */
function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function toLocalDate(date: Date | string): Date {
  if (typeof date === 'string') return parseLocalDate(date);
  return date;
}

export function dateToX(
  date: Date | string,
  projectStart: Date | string,
  projectEnd: Date | string,
  totalWidth: number
): number {
  const d = toLocalDate(date);
  const start = toLocalDate(projectStart);
  const end = toLocalDate(projectEnd);

  const totalDays = differenceInDays(end, start) || 1;
  const dayOffset = differenceInDays(d, start);
  return Math.round((dayOffset / totalDays) * totalWidth);
}

export function getComplianceStatus(
  expiryDate: string | null,
  projectStart: string,
  projectEnd: string
): ComplianceStatus {
  if (!expiryDate) return 'valid';

  const expiry = parseLocalDate(expiryDate);
  const start = parseLocalDate(projectStart);
  const end = parseLocalDate(projectEnd);

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
