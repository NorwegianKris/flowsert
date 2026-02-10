import { Personnel, Certificate } from '@/types';
import { ProjectCalendarItem } from '@/hooks/useProjects';

export interface AvailabilitySpan {
  personnelId: string;
  startDate: string;
  endDate: string;
  status: 'available' | 'partial' | 'other' | 'unavailable';
}

export type ComplianceStatus = 'valid' | 'warning' | 'expired';

export interface ComplianceBar {
  certificate: Certificate;
  status: ComplianceStatus;
}

export interface PersonnelTimelineData {
  person: Personnel;
  availabilitySpans: AvailabilitySpan[];
  complianceBars: ComplianceBar[];
}

export const LANE_HEIGHT = 28;
export const LABEL_WIDTH = 160;
export const MIN_TIMELINE_WIDTH = 600;
