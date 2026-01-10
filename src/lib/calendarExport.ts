import { format, parseISO } from 'date-fns';
import { Project } from '@/hooks/useProjects';
import { Personnel } from '@/types';
import { getCertificateStatus } from '@/lib/certificateUtils';

interface CalendarExportEvent {
  title: string;
  description: string;
  startDate: Date;
  endDate?: Date;
  allDay: boolean;
}

function escapeICSText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function formatICSDate(date: Date, allDay: boolean = true): string {
  if (allDay) {
    return format(date, "yyyyMMdd");
  }
  return format(date, "yyyyMMdd'T'HHmmss");
}

function generateUID(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}@lovable.app`;
}

export function generateICSContent(
  projects: Project[],
  personnel: Personnel[],
  includeCertificates: boolean = true,
  includeProjects: boolean = true
): string {
  const events: CalendarExportEvent[] = [];

  // Add project events
  if (includeProjects) {
    projects.forEach(project => {
      // Add project start
      events.push({
        title: `${project.name} - Start`,
        description: project.description || '',
        startDate: parseISO(project.startDate),
        allDay: true,
      });

      // Add project end if exists
      if (project.endDate) {
        events.push({
          title: `${project.name} - End`,
          description: project.description || '',
          startDate: parseISO(project.endDate),
          allDay: true,
        });
      }

      // Add calendar items
      project.calendarItems?.forEach(item => {
        events.push({
          title: `${project.name}: ${item.description}`,
          description: `Project: ${project.name}`,
          startDate: parseISO(item.date),
          allDay: true,
        });
      });
    });
  }

  // Add certificate expiry events
  if (includeCertificates) {
    personnel.forEach(person => {
      person.certificates.forEach(cert => {
        if (cert.expiryDate) {
          const status = getCertificateStatus(cert.expiryDate);
          events.push({
            title: `Certificate Expiry: ${cert.name} (${person.name})`,
            description: `Certificate: ${cert.name}\nHolder: ${person.name}\nStatus: ${status}`,
            startDate: new Date(cert.expiryDate),
            allDay: true,
          });
        }
      });
    });
  }

  // Generate ICS content
  const icsLines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Lovable//Master Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Master Calendar',
  ];

  events.forEach(event => {
    icsLines.push('BEGIN:VEVENT');
    icsLines.push(`UID:${generateUID()}`);
    icsLines.push(`DTSTAMP:${formatICSDate(new Date(), false)}Z`);
    icsLines.push(`DTSTART;VALUE=DATE:${formatICSDate(event.startDate, true)}`);
    
    if (event.endDate) {
      icsLines.push(`DTEND;VALUE=DATE:${formatICSDate(event.endDate, true)}`);
    } else {
      // For all-day events, end date is next day
      const nextDay = new Date(event.startDate);
      nextDay.setDate(nextDay.getDate() + 1);
      icsLines.push(`DTEND;VALUE=DATE:${formatICSDate(nextDay, true)}`);
    }
    
    icsLines.push(`SUMMARY:${escapeICSText(event.title)}`);
    if (event.description) {
      icsLines.push(`DESCRIPTION:${escapeICSText(event.description)}`);
    }
    icsLines.push('END:VEVENT');
  });

  icsLines.push('END:VCALENDAR');

  return icsLines.join('\r\n');
}

export function downloadICSFile(content: string, filename: string = 'master-calendar.ics'): void {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}
