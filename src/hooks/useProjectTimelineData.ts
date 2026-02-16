import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Personnel } from '@/types';
import { AvailabilitySpan, ComplianceBar, PersonnelTimelineData } from '@/components/project-timeline/types';
import { getComplianceStatus } from '@/components/project-timeline/utils';

interface AvailabilityRecord {
  personnel_id: string;
  date: string;
  status: string;
}

function fillGapsWithAvailable(
  records: AvailabilityRecord[],
  personnelId: string,
  projectStart: string,
  projectEnd: string
): AvailabilitySpan[] {
  // Build day-by-day status map, defaulting every day to "available"
  const statusMap = new Map<string, string>();
  const start = new Date(projectStart + 'T00:00:00');
  const end = new Date(projectEnd + 'T00:00:00');

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    statusMap.set(d.toISOString().split('T')[0], 'available');
  }

  // Override with explicit records
  for (const rec of records) {
    if (statusMap.has(rec.date)) {
      statusMap.set(rec.date, rec.status);
    }
  }

  // Walk sorted dates and merge consecutive same-status into spans
  const sortedDates = Array.from(statusMap.keys()).sort();
  if (sortedDates.length === 0) return [];

  const spans: AvailabilitySpan[] = [];
  let curStatus = statusMap.get(sortedDates[0])!;
  let curStart = sortedDates[0];
  let curEnd = sortedDates[0];

  for (let i = 1; i < sortedDates.length; i++) {
    const date = sortedDates[i];
    const status = statusMap.get(date)!;
    if (status === curStatus) {
      curEnd = date;
    } else {
      if (curStatus !== 'unavailable') {
        spans.push({
          personnelId,
          startDate: curStart,
          endDate: curEnd,
          status: curStatus as AvailabilitySpan['status'],
        });
      }
      curStatus = status;
      curStart = date;
      curEnd = date;
    }
  }
  // Push last span
  if (curStatus !== 'unavailable') {
    spans.push({
      personnelId,
      startDate: curStart,
      endDate: curEnd,
      status: curStatus as AvailabilitySpan['status'],
    });
  }

  return spans;
}

export function useProjectTimelineData(
  personnelIds: string[],
  startDate: string | undefined,
  endDate: string | undefined
) {
  const [rawRecordsMap, setRawRecordsMap] = useState<Map<string, AvailabilityRecord[]>>(new Map());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!startDate || !endDate || personnelIds.length === 0) {
      setRawRecordsMap(new Map());
      return;
    }

    const fetchAvailability = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('availability')
          .select('personnel_id, date, status')
          .in('personnel_id', personnelIds)
          .gte('date', startDate)
          .lte('date', endDate)
          .order('date', { ascending: true });

        if (error) throw error;

        const grouped = new Map<string, AvailabilityRecord[]>();
        (data || []).forEach((rec) => {
          const existing = grouped.get(rec.personnel_id) || [];
          existing.push(rec);
          grouped.set(rec.personnel_id, existing);
        });

        setRawRecordsMap(grouped);
      } catch (err) {
        console.error('Error fetching timeline availability:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAvailability();
  }, [personnelIds.join(','), startDate, endDate]);

  return { rawRecordsMap, loading };
}

/**
 * Build timeline data for each person. Fills gaps with "available" default.
 */
export function buildPersonnelTimelineData(
  personnel: Personnel[],
  rawRecordsMap: Map<string, AvailabilityRecord[]>,
  projectStart: string,
  projectEnd: string
): PersonnelTimelineData[] {
  return personnel.map((person) => {
    const records = rawRecordsMap.get(person.id) || [];
    const availabilitySpans = fillGapsWithAvailable(records, person.id, projectStart, projectEnd);

    const complianceBars: ComplianceBar[] = person.certificates
      .filter((cert) => cert.expiryDate !== null)
      .map((cert) => ({
        certificate: cert,
        status: getComplianceStatus(cert.expiryDate, projectStart, projectEnd),
      }));

    return { person, availabilitySpans, complianceBars };
  });
}
