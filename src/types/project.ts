export interface CalendarItem {
  id: string;
  date: string;
  description: string;
}

export interface Project {
  id: string;
  name: string;
  status: 'active' | 'completed' | 'pending';
  description: string;
  startDate: string;
  endDate?: string;
  assignedPersonnel: string[];
  calendarItems?: CalendarItem[];
}

export const dummyProjects: Project[] = [
  {
    id: '1',
    name: 'Offshore Wind Farm Installation',
    status: 'active',
    description: 'Installation and commissioning of offshore wind turbines in the North Sea.',
    startDate: '2025-01-01',
    endDate: '2025-06-30',
    assignedPersonnel: [],
  },
  {
    id: '2',
    name: 'Platform Maintenance Q1',
    status: 'active',
    description: 'Quarterly maintenance operations for Platform Alpha.',
    startDate: '2025-01-15',
    endDate: '2025-03-15',
    assignedPersonnel: [],
  },
  {
    id: '3',
    name: 'Emergency Response Training',
    status: 'pending',
    description: 'Annual emergency response and safety training program.',
    startDate: '2025-02-01',
    assignedPersonnel: [],
  },
  {
    id: '4',
    name: 'Pipeline Inspection 2024',
    status: 'completed',
    description: 'Annual pipeline inspection and integrity assessment.',
    startDate: '2024-09-01',
    endDate: '2024-11-30',
    assignedPersonnel: [],
  },
  {
    id: '5',
    name: 'Rig Decommissioning Phase 1',
    status: 'completed',
    description: 'First phase of rig decommissioning operations.',
    startDate: '2024-06-01',
    endDate: '2024-08-31',
    assignedPersonnel: [],
  },
];
