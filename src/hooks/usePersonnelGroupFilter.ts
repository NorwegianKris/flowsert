import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface UsePersonnelGroupFilterResult {
  personnelIdFilter: string[] | null;
  isLoading: boolean;
}

export function usePersonnelGroupFilter(
  selectedGroupIds: string[],
  includeUngrouped: boolean,
  allPersonnelIds: string[]
): UsePersonnelGroupFilterResult {
  const { businessId } = useAuth();

  // Query 1: personnel IDs in selected groups
  const { data: groupMatchIds = [], isLoading: loadingGroupMatch } = useQuery({
    queryKey: ['personnel-group-filter-match', selectedGroupIds],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('personnel_worker_groups' as any)
        .select('personnel_id')
        .in('worker_group_id', selectedGroupIds) as any);
      if (error) throw error;
      const ids = new Set<string>();
      for (const row of (data || [])) {
        ids.add(row.personnel_id);
      }
      return Array.from(ids);
    },
    enabled: selectedGroupIds.length > 0 && !!businessId,
  });

  // Query 2: all grouped personnel IDs (for ungrouped computation)
  const { data: allGroupedIds = [], isLoading: loadingGrouped } = useQuery({
    queryKey: ['personnel-all-grouped-ids', businessId],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('personnel_worker_groups' as any)
        .select('personnel_id') as any);
      if (error) throw error;
      const ids = new Set<string>();
      for (const row of (data || [])) {
        ids.add(row.personnel_id);
      }
      return Array.from(ids);
    },
    enabled: includeUngrouped && !!businessId,
  });

  const result = useMemo<UsePersonnelGroupFilterResult>(() => {
    const hasGroups = selectedGroupIds.length > 0;
    const isLoading = (hasGroups && loadingGroupMatch) || (includeUngrouped && loadingGrouped);

    // Inactive: no filters active
    if (!hasGroups && !includeUngrouped) {
      return { personnelIdFilter: null, isLoading: false };
    }

    if (isLoading) {
      return { personnelIdFilter: null, isLoading: true };
    }

    const resultSet = new Set<string>();

    // Add group matches
    if (hasGroups) {
      for (const id of groupMatchIds) {
        resultSet.add(id);
      }
    }

    // Add ungrouped
    if (includeUngrouped) {
      const groupedSet = new Set(allGroupedIds);
      for (const id of allPersonnelIds) {
        if (!groupedSet.has(id)) {
          resultSet.add(id);
        }
      }
    }

    return { personnelIdFilter: Array.from(resultSet), isLoading: false };
  }, [selectedGroupIds, includeUngrouped, groupMatchIds, allGroupedIds, allPersonnelIds, loadingGroupMatch, loadingGrouped]);

  return result;
}
