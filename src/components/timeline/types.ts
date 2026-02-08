export type TimelineEventStatus = 'overdue' | 'next30' | 'days31to60' | 'days61to90' | 'beyond90';

export interface TimelineEvent {
  id: string;
  personnelId: string;
  personnelName: string;
  certificateName: string;
  expiryDate: Date;
  daysUntilExpiry: number;
  status: TimelineEventStatus;
  color: string;
}

export interface LaneConfig {
  id: TimelineEventStatus;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  filterParams: { minDays?: number; maxDays?: number; overdue?: boolean };
}

export const LANE_CONFIGS: LaneConfig[] = [
  { 
    id: 'overdue', 
    label: 'Overdue', 
    color: '#ef4444', 
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    filterParams: { overdue: true }
  },
  { 
    id: 'next30', 
    label: 'Next 30 Days', 
    color: '#f97316', 
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
    filterParams: { minDays: 0, maxDays: 30 }
  },
  { 
    id: 'days31to60', 
    label: '31-60 Days', 
    color: '#eab308', 
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
    filterParams: { minDays: 31, maxDays: 60 }
  },
  { 
    id: 'days61to90', 
    label: '61-90 Days', 
    color: '#22c55e', 
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    filterParams: { minDays: 61, maxDays: 90 }
  },
];

export function getEventStatus(daysUntil: number | null): TimelineEventStatus {
  if (daysUntil === null) return 'beyond90';
  if (daysUntil < 0) return 'overdue';
  if (daysUntil <= 30) return 'next30';
  if (daysUntil <= 60) return 'days31to60';
  if (daysUntil <= 90) return 'days61to90';
  return 'beyond90';
}

export function getEventColor(daysUntil: number | null): string {
  if (daysUntil === null) return 'hsl(var(--muted-foreground))';
  if (daysUntil < 0) return '#ef4444'; // Red
  if (daysUntil <= 30) return '#f97316'; // Orange
  if (daysUntil <= 60) return '#eab308'; // Yellow
  if (daysUntil <= 90) return '#22c55e'; // Green
  return 'hsl(var(--muted-foreground))'; // Gray
}
