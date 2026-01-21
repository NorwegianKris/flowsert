import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface AvailabilityRecord {
  personnel_id: string;
  date: string;
  status: string;
}

export function usePersonnelAvailability(startDate?: Date, endDate?: Date) {
  const { businessId } = useAuth();
  const [availabilityMap, setAvailabilityMap] = useState<Map<string, AvailabilityRecord[]>>(new Map());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchAvailability = async () => {
      if (!businessId || !startDate) {
        setAvailabilityMap(new Map());
        return;
      }

      setLoading(true);
      try {
        const start = startDate.toISOString().split('T')[0];
        const end = endDate ? endDate.toISOString().split('T')[0] : start;

        // Fetch availability records within the date range
        const { data, error } = await supabase
          .from('availability')
          .select('personnel_id, date, status')
          .gte('date', start)
          .lte('date', end);

        if (error) throw error;

        // Group by personnel_id
        const map = new Map<string, AvailabilityRecord[]>();
        (data || []).forEach((record) => {
          const existing = map.get(record.personnel_id) || [];
          existing.push(record);
          map.set(record.personnel_id, existing);
        });

        setAvailabilityMap(map);
      } catch (error) {
        console.error('Error fetching availability:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAvailability();
  }, [businessId, startDate?.toISOString(), endDate?.toISOString()]);

  // Check if a personnel is available for all dates in the range
  const isAvailable = (personnelId: string): boolean => {
    if (!startDate) return true; // No filter applied

    const records = availabilityMap.get(personnelId) || [];
    
    // If no records exist for this personnel in the range, assume available
    if (records.length === 0) return true;

    // Check if any date is marked as unavailable
    const hasUnavailable = records.some((r) => r.status === 'unavailable');
    return !hasUnavailable;
  };

  // Get availability status summary for a personnel
  const getAvailabilityStatus = (personnelId: string): 'available' | 'partial' | 'unavailable' | 'unknown' => {
    if (!startDate) return 'unknown';

    const records = availabilityMap.get(personnelId) || [];
    
    if (records.length === 0) return 'unknown'; // No data

    const hasUnavailable = records.some((r) => r.status === 'unavailable');
    const hasPartial = records.some((r) => r.status === 'partial');
    const allAvailable = records.every((r) => r.status === 'available');

    if (hasUnavailable) return 'unavailable';
    if (allAvailable) return 'available';
    if (hasPartial) return 'partial';
    return 'unknown';
  };

  return { 
    availabilityMap, 
    loading, 
    isAvailable,
    getAvailabilityStatus 
  };
}
