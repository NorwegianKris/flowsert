import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ProjectPhase {
  id: string;
  projectId: string;
  name: string;
  startDate: string;
  endDate: string;
  color: string;
}

export function useProjectPhases(projectId: string) {
  const [phases, setPhases] = useState<ProjectPhase[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPhases = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('project_phases')
        .select('*')
        .eq('project_id', projectId)
        .order('start_date', { ascending: true });

      if (error) throw error;

      setPhases(
        (data || []).map((row: any) => ({
          id: row.id,
          projectId: row.project_id,
          name: row.name,
          startDate: row.start_date,
          endDate: row.end_date,
          color: row.color || 'primary',
        }))
      );
    } catch (err) {
      console.error('Error fetching project phases:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) fetchPhases();
  }, [projectId, fetchPhases]);

  const addPhase = useCallback(
    async (phase: Omit<ProjectPhase, 'id' | 'projectId'>) => {
      try {
        const { error } = await supabase.from('project_phases').insert({
          project_id: projectId,
          name: phase.name,
          start_date: phase.startDate,
          end_date: phase.endDate,
          color: phase.color,
        });

        if (error) throw error;
        toast.success('Phase added');
        await fetchPhases();
      } catch (err) {
        console.error('Error adding phase:', err);
        toast.error('Failed to add phase');
      }
    },
    [projectId, fetchPhases]
  );

  const removePhase = useCallback(
    async (phaseId: string) => {
      try {
        const { error } = await supabase
          .from('project_phases')
          .delete()
          .eq('id', phaseId);

        if (error) throw error;
        toast.success('Phase removed');
        await fetchPhases();
      } catch (err) {
        console.error('Error removing phase:', err);
        toast.error('Failed to remove phase');
      }
    },
    [fetchPhases]
  );

  return { phases, loading, addPhase, removePhase, refetch: fetchPhases };
}
