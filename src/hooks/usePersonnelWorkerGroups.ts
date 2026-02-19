import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface PersonnelWorkerGroup {
  personnel_id: string;
  worker_group_id: string;
  created_at: string;
}

export function usePersonnelWorkerGroups() {
  const { businessId } = useAuth();

  return useQuery({
    queryKey: ['personnel-worker-groups', businessId],
    queryFn: async () => {
      if (!businessId) return [];
      const { data, error } = await (supabase
        .from('personnel_worker_groups' as any)
        .select('personnel_id, worker_group_id, created_at') as any);
      if (error) throw error;
      return (data as PersonnelWorkerGroup[]) || [];
    },
    enabled: !!businessId,
  });
}

export function useAssignPersonnelToGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ personnelIds, workerGroupId }: { personnelIds: string[]; workerGroupId: string }) => {
      const rows = personnelIds.map(pid => ({
        personnel_id: pid,
        worker_group_id: workerGroupId,
      }));
      const { error } = await (supabase
        .from('personnel_worker_groups' as any)
        .upsert(rows, { onConflict: 'personnel_id,worker_group_id' }) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personnel-worker-groups'] });
      queryClient.invalidateQueries({ queryKey: ['worker-group-member-counts'] });
      toast.success('Personnel assigned to group');
    },
    onError: () => {
      toast.error('Failed to assign personnel');
    },
  });
}

export function useUnassignPersonnelFromGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ personnelId, workerGroupId }: { personnelId: string; workerGroupId: string }) => {
      const { error } = await (supabase
        .from('personnel_worker_groups' as any)
        .delete()
        .eq('personnel_id', personnelId)
        .eq('worker_group_id', workerGroupId) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personnel-worker-groups'] });
      queryClient.invalidateQueries({ queryKey: ['worker-group-member-counts'] });
    },
    onError: () => {
      toast.error('Failed to remove from group');
    },
  });
}
