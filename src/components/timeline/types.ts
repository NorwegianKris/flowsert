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

export interface TimelineRange {
  start: Date;
  end: Date;
}

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
