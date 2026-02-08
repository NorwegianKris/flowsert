import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface FreelancerInvitation {
  id: string;
  token: string;
  name: string;
  isActive: boolean;
  createdAt: string;
}

interface DbFreelancerInvitation {
  id: string;
  token: string;
  name: string;
  is_active: boolean;
  created_at: string;
  business_id: string;
}

export function useFreelancerInvitations() {
  const [invitations, setInvitations] = useState<FreelancerInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const { businessId } = useAuth();
  const { toast } = useToast();

  const fetchInvitations = async () => {
    if (!businessId) {
      setInvitations([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await (supabase as any)
        .from('job_seeker_invitations')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setInvitations(
        ((data || []) as DbFreelancerInvitation[]).map((inv) => ({
          id: inv.id,
          token: inv.token,
          name: inv.name,
          isActive: inv.is_active,
          createdAt: inv.created_at,
        }))
      );
    } catch (error) {
      console.error('Error fetching freelancer invitations:', error);
    } finally {
      setLoading(false);
    }
  };

  const createInvitation = async (name: string) => {
    if (!businessId) return null;

    try {
      const { data, error } = await (supabase as any)
        .from('job_seeker_invitations')
        .insert({ business_id: businessId, name })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Invitation Created',
        description: 'Freelancer invitation link has been created.',
      });

      await fetchInvitations();
      return data;
    } catch (error) {
      console.error('Error creating freelancer invitation:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create freelancer invitation.',
      });
      return null;
    }
  };

  const toggleInvitation = async (id: string, isActive: boolean) => {
    try {
      const { error } = await (supabase as any)
        .from('job_seeker_invitations')
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: isActive ? 'Invitation Activated' : 'Invitation Deactivated',
        description: `The invitation link is now ${isActive ? 'active' : 'inactive'}.`,
      });

      await fetchInvitations();
    } catch (error) {
      console.error('Error toggling freelancer invitation:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update invitation status.',
      });
    }
  };

  const deleteInvitation = async (id: string) => {
    try {
      const { error } = await (supabase as any)
        .from('job_seeker_invitations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Invitation Deleted',
        description: 'Freelancer invitation has been deleted.',
      });

      await fetchInvitations();
    } catch (error) {
      console.error('Error deleting freelancer invitation:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete invitation.',
      });
    }
  };

  useEffect(() => {
    fetchInvitations();
  }, [businessId]);

  return {
    invitations,
    loading,
    createInvitation,
    toggleInvitation,
    deleteInvitation,
    refetch: fetchInvitations,
  };
}
