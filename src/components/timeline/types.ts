export type TimelineEventStatus = 'overdue' | 'next30' | 'days31to60' | 'days61to90' | 'days91to180' | 'days181to365' | 'beyond365';

export interface TimelineEvent {
  id: string;
  personnelId: string;
  personnelName: string;
  certificateName: string;
  expiryDate: Date;
  daysUntilExpiry: number;
  status: TimelineEventStatus;
  color: string;
  // Filter properties
  certificateTypeId: string | null;
  certificateCategoryId: string | null;
  // Extended detail fields
  issuingAuthority?: string | null;
  dateOfIssue?: string | null;
  categoryName?: string | null;
  placeOfIssue?: string | null;
  documentUrl?: string | null;
}

export interface LaneConfig {
  id: TimelineEventStatus;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  filterParams: { minDays?: number; maxDays?: number; overdue?: boolean };
}

// Base lanes (always shown)
export const BASE_LANE_CONFIGS: LaneConfig[] = [
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

// Extended lanes (shown when zoomed out)
export const EXTENDED_LANE_CONFIGS: LaneConfig[] = [
  { 
    id: 'days91to180', 
    label: '91-180 Days', 
    color: '#3b82f6', 
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    filterParams: { minDays: 91, maxDays: 180 }
  },
  { 
    id: 'days181to365', 
    label: '6-12 Months', 
    color: '#6366f1', 
    bgColor: 'bg-indigo-500/10',
    borderColor: 'border-indigo-500/30',
    filterParams: { minDays: 181, maxDays: 365 }
  },
  { 
    id: 'beyond365', 
    label: '1-2 Years', 
    color: '#6b7280', 
    bgColor: 'bg-gray-500/10',
    borderColor: 'border-gray-500/30',
    filterParams: { minDays: 366, maxDays: 730 }
  },
];

// Legacy export for backward compatibility
export const LANE_CONFIGS = BASE_LANE_CONFIGS;

// Get lane configs based on timeline end days
export function getLaneConfigsForRange(timelineEndDays: number): LaneConfig[] {
  const configs = [...BASE_LANE_CONFIGS];
  
  if (timelineEndDays > 90) {
    configs.push(EXTENDED_LANE_CONFIGS[0]); // 91-180 Days
  }
  if (timelineEndDays > 180) {
    configs.push(EXTENDED_LANE_CONFIGS[1]); // 6-12 Months
  }
  if (timelineEndDays > 365) {
    configs.push(EXTENDED_LANE_CONFIGS[2]); // 1-2 Years
  }
  
  return configs;
}

export function getEventStatus(daysUntil: number | null): TimelineEventStatus {
  if (daysUntil === null) return 'beyond365';
  if (daysUntil < 0) return 'overdue';
  if (daysUntil <= 30) return 'next30';
  if (daysUntil <= 60) return 'days31to60';
  if (daysUntil <= 90) return 'days61to90';
  if (daysUntil <= 180) return 'days91to180';
  if (daysUntil <= 365) return 'days181to365';
  return 'beyond365';
}

export function getEventColor(daysUntil: number | null): string {
  if (daysUntil === null) return 'hsl(var(--muted-foreground))';
  if (daysUntil < 0) return '#ef4444'; // Red
  if (daysUntil <= 30) return '#f97316'; // Orange
  if (daysUntil <= 60) return '#eab308'; // Yellow
  if (daysUntil <= 90) return '#22c55e'; // Green
  if (daysUntil <= 180) return '#3b82f6'; // Blue
  if (daysUntil <= 365) return '#6366f1'; // Indigo
  return '#6b7280'; // Gray
}
