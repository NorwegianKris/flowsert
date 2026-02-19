import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface WorkerGroup {
  id: string;
  name: string;
  business_id: string;
  created_at: string;
  updated_at: string;
}

export function useWorkerGroups() {
  const { businessId } = useAuth();

  return useQuery({
    queryKey: ['worker-groups', businessId],
    queryFn: async () => {
      if (!businessId) return [];
      const { data, error } = await (supabase
        .from('worker_groups' as any)
        .select('*')
        .eq('business_id', businessId)
        .order('name') as any);
      if (error) throw error;
      return (data as WorkerGroup[]) || [];
    },
    enabled: !!businessId,
  });
}

export function useCreateWorkerGroup() {
  const { businessId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      if (!businessId) throw new Error('No business ID');
      const { data, error } = await (supabase
        .from('worker_groups' as any)
        .insert({ business_id: businessId, name: name.trim() })
        .select()
        .single() as any);
      if (error) {
        if (error.code === '23505') {
          throw new Error('A group with this name already exists');
        }
        throw error;
      }
      return data as WorkerGroup;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worker-groups'] });
      toast.success('Group created');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create group');
    },
  });
}

export function useUpdateWorkerGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await (supabase
        .from('worker_groups' as any)
        .update({ name: name.trim() })
        .eq('id', id) as any);
      if (error) {
        if (error.code === '23505') {
          throw new Error('A group with this name already exists');
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worker-groups'] });
      toast.success('Group renamed');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to rename group');
    },
  });
}

export function useDeleteWorkerGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase
        .from('worker_groups' as any)
        .delete()
        .eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worker-groups'] });
      queryClient.invalidateQueries({ queryKey: ['personnel-worker-groups'] });
      queryClient.invalidateQueries({ queryKey: ['worker-group-member-counts'] });
      toast.success('Group deleted');
    },
    onError: () => {
      toast.error('Failed to delete group');
    },
  });
}

export function useWorkerGroupMemberCounts() {
  const { businessId } = useAuth();

  return useQuery({
    queryKey: ['worker-group-member-counts', businessId],
    queryFn: async () => {
      if (!businessId) return [];
      // We need to get all junction rows accessible to this admin, then aggregate client-side
      const { data, error } = await (supabase
        .from('personnel_worker_groups' as any)
        .select('worker_group_id') as any);
      if (error) throw error;
      
      const counts = new Map<string, number>();
      for (const row of (data || [])) {
        const gid = row.worker_group_id;
        counts.set(gid, (counts.get(gid) || 0) + 1);
      }
      return Array.from(counts.entries()).map(([worker_group_id, count]) => ({
        worker_group_id,
        count,
      }));
    },
    enabled: !!businessId,
  });
}
