import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Personnel } from '@/types';
import { AvailabilitySpan, ComplianceBar, PersonnelTimelineData } from '@/components/project-timeline/types';
import { getComplianceStatus } from '@/components/project-timeline/utils';

interface AvailabilityRecord {
  personnel_id: string;
  date: string;
  status: string;
}

function mergeAvailabilitySpans(records: AvailabilityRecord[]): AvailabilitySpan[] {
  if (records.length === 0) return [];

  // Sort by date
  const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
  const spans: AvailabilitySpan[] = [];
  let current: AvailabilitySpan = {
    personnelId: sorted[0].personnel_id,
    startDate: sorted[0].date,
    endDate: sorted[0].date,
    status: sorted[0].status as AvailabilitySpan['status'],
  };

  for (let i = 1; i < sorted.length; i++) {
    const rec = sorted[i];
    const prevDate = new Date(current.endDate);
    prevDate.setDate(prevDate.getDate() + 1);
    const nextDay = prevDate.toISOString().split('T')[0];

    if (rec.status === current.status && rec.date === nextDay) {
      current.endDate = rec.date;
    } else {
      if (current.status !== 'unavailable') {
        spans.push(current);
      }
      current = {
        personnelId: rec.personnel_id,
        startDate: rec.date,
        endDate: rec.date,
        status: rec.status as AvailabilitySpan['status'],
      };
    }
  }
  if (current.status !== 'unavailable') {
    spans.push(current);
  }

  return spans;
}

export function useProjectTimelineData(
  personnelIds: string[],
  startDate: string | undefined,
  endDate: string | undefined
) {
  const [availabilityMap, setAvailabilityMap] = useState<Map<string, AvailabilitySpan[]>>(new Map());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!startDate || !endDate || personnelIds.length === 0) {
      setAvailabilityMap(new Map());
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

        const result = new Map<string, AvailabilitySpan[]>();
        grouped.forEach((records, pid) => {
          result.set(pid, mergeAvailabilitySpans(records));
        });

        setAvailabilityMap(result);
      } catch (err) {
        console.error('Error fetching timeline availability:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAvailability();
  }, [personnelIds.join(','), startDate, endDate]);

  return { availabilityMap, loading };
}

/**
 * Build timeline data for each person. If a person has no availability records,
 * they default to "available" for the entire project period.
 */
export function buildPersonnelTimelineData(
  personnel: Personnel[],
  availabilityMap: Map<string, AvailabilitySpan[]>,
  projectStart: string,
  projectEnd: string
): PersonnelTimelineData[] {
  return personnel.map((person) => {
    let availabilitySpans = availabilityMap.get(person.id);

    // Default: full project span as available when no data exists
    if (!availabilitySpans || availabilitySpans.length === 0) {
      availabilitySpans = [
        {
          personnelId: person.id,
          startDate: projectStart,
          endDate: projectEnd,
          status: 'available',
        },
      ];
    }

    const complianceBars: ComplianceBar[] = person.certificates
      .filter((cert) => cert.expiryDate !== null)
      .map((cert) => ({
        certificate: cert,
        status: getComplianceStatus(cert.expiryDate, projectStart, projectEnd),
      }));

    return { person, availabilitySpans, complianceBars };
  });
}
