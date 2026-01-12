import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ProjectInvitation {
  id: string;
  projectId: string;
  personnelId: string;
  status: 'pending' | 'accepted' | 'declined';
  invitedBy: string | null;
  invitedAt: string;
  respondedAt: string | null;
  // Joined data
  projectName?: string;
  personnelName?: string;
}

interface DbProjectInvitation {
  id: string;
  project_id: string;
  personnel_id: string;
  status: string;
  invited_by: string | null;
  invited_at: string;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useProjectInvitations() {
  const [invitations, setInvitations] = useState<ProjectInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();

  const fetchInvitations = useCallback(async () => {
    if (!profile?.business_id) {
      setInvitations([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Fetch invitations with project and personnel names
      const { data, error } = await supabase
        .from('project_invitations')
        .select(`
          *,
          projects:project_id (name),
          personnel:personnel_id (name)
        `)
        .order('invited_at', { ascending: false });

      if (error) throw error;

      const mappedInvitations: ProjectInvitation[] = (data || []).map((inv: any) => ({
        id: inv.id,
        projectId: inv.project_id,
        personnelId: inv.personnel_id,
        status: inv.status as 'pending' | 'accepted' | 'declined',
        invitedBy: inv.invited_by,
        invitedAt: inv.invited_at,
        respondedAt: inv.responded_at,
        projectName: inv.projects?.name,
        personnelName: inv.personnel?.name,
      }));

      setInvitations(mappedInvitations);
    } catch (error) {
      console.error('Error fetching invitations:', error);
      toast.error('Failed to load invitations');
    } finally {
      setLoading(false);
    }
  }, [profile?.business_id]);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  const sendInvitation = async (
    projectId: string,
    personnelId: string
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('project_invitations')
        .insert({
          project_id: projectId,
          personnel_id: personnelId,
          invited_by: profile?.id,
        });

      if (error) {
        // Handle duplicate invitation
        if (error.code === '23505') {
          toast.error('Invitation already sent to this personnel');
          return false;
        }
        throw error;
      }

      await fetchInvitations();
      return true;
    } catch (error) {
      console.error('Error sending invitation:', error);
      toast.error('Failed to send invitation');
      return false;
    }
  };

  const sendBulkInvitations = async (
    projectId: string,
    personnelIds: string[]
  ): Promise<{ success: number; failed: number }> => {
    let success = 0;
    let failed = 0;

    for (const personnelId of personnelIds) {
      try {
        const { error } = await supabase
          .from('project_invitations')
          .insert({
            project_id: projectId,
            personnel_id: personnelId,
            invited_by: profile?.id,
          });

        if (error) {
          failed++;
        } else {
          success++;
        }
      } catch {
        failed++;
      }
    }

    await fetchInvitations();
    return { success, failed };
  };

  const respondToInvitation = async (
    invitationId: string,
    accept: boolean
  ): Promise<boolean> => {
    try {
      const { data: invitation, error: fetchError } = await supabase
        .from('project_invitations')
        .select('project_id, personnel_id')
        .eq('id', invitationId)
        .single();

      if (fetchError) throw fetchError;

      // Update invitation status
      const { error: updateError } = await supabase
        .from('project_invitations')
        .update({
          status: accept ? 'accepted' : 'declined',
          responded_at: new Date().toISOString(),
        })
        .eq('id', invitationId);

      if (updateError) throw updateError;

      if (accept) {
        // Add personnel to project's assigned_personnel
        const { data: project, error: projectFetchError } = await supabase
          .from('projects')
          .select('assigned_personnel')
          .eq('id', invitation.project_id)
          .single();

        if (projectFetchError) throw projectFetchError;

        const currentPersonnel = project.assigned_personnel || [];
        if (!currentPersonnel.includes(invitation.personnel_id)) {
          const { error: projectUpdateError } = await supabase
            .from('projects')
            .update({
              assigned_personnel: [...currentPersonnel, invitation.personnel_id],
            })
            .eq('id', invitation.project_id);

          if (projectUpdateError) throw projectUpdateError;
        }

        toast.success('Invitation accepted! You have been added to the project.');
      } else {
        // Remove from assigned_personnel if declining
        const { data: project, error: projectFetchError } = await supabase
          .from('projects')
          .select('assigned_personnel')
          .eq('id', invitation.project_id)
          .single();

        if (projectFetchError) throw projectFetchError;

        const currentPersonnel = project.assigned_personnel || [];
        const updatedPersonnel = currentPersonnel.filter(
          (id: string) => id !== invitation.personnel_id
        );

        const { error: projectUpdateError } = await supabase
          .from('projects')
          .update({
            assigned_personnel: updatedPersonnel,
          })
          .eq('id', invitation.project_id);

        if (projectUpdateError) throw projectUpdateError;

        toast.success('Invitation declined.');
      }

      await fetchInvitations();
      return true;
    } catch (error) {
      console.error('Error responding to invitation:', error);
      toast.error('Failed to respond to invitation');
      return false;
    }
  };

  const getInvitationsForProject = (projectId: string) => {
    return invitations.filter((inv) => inv.projectId === projectId);
  };

  const getInvitationsForPersonnel = (personnelId: string) => {
    return invitations.filter((inv) => inv.personnelId === personnelId);
  };

  const getPendingInvitationsForPersonnel = (personnelId: string) => {
    return invitations.filter(
      (inv) => inv.personnelId === personnelId && inv.status === 'pending'
    );
  };

  const updateInvitationStatus = async (
    invitationId: string,
    newStatus: 'pending' | 'accepted' | 'declined'
  ): Promise<boolean> => {
    try {
      const { data: invitation, error: fetchError } = await supabase
        .from('project_invitations')
        .select('project_id, personnel_id, status')
        .eq('id', invitationId)
        .single();

      if (fetchError) throw fetchError;

      const oldStatus = invitation.status;

      // Update invitation status
      const { error: updateError } = await supabase
        .from('project_invitations')
        .update({
          status: newStatus,
          responded_at: newStatus !== 'pending' ? new Date().toISOString() : null,
        })
        .eq('id', invitationId);

      if (updateError) throw updateError;

      // Handle assigned_personnel updates based on status change
      const { data: project, error: projectFetchError } = await supabase
        .from('projects')
        .select('assigned_personnel')
        .eq('id', invitation.project_id)
        .single();

      if (projectFetchError) throw projectFetchError;

      const currentPersonnel = project.assigned_personnel || [];
      let updatedPersonnel = [...currentPersonnel];

      if (newStatus === 'accepted') {
        // Add to project if not already there
        if (!currentPersonnel.includes(invitation.personnel_id)) {
          updatedPersonnel = [...currentPersonnel, invitation.personnel_id];
        }
      } else {
        // Remove from project if previously accepted
        if (oldStatus === 'accepted') {
          updatedPersonnel = currentPersonnel.filter(
            (id: string) => id !== invitation.personnel_id
          );
        }
      }

      // Only update if personnel list changed
      if (JSON.stringify(updatedPersonnel) !== JSON.stringify(currentPersonnel)) {
        const { error: projectUpdateError } = await supabase
          .from('projects')
          .update({ assigned_personnel: updatedPersonnel })
          .eq('id', invitation.project_id);

        if (projectUpdateError) throw projectUpdateError;
      }

      await fetchInvitations();
      toast.success(`Invitation status updated to ${newStatus}`);
      return true;
    } catch (error) {
      console.error('Error updating invitation status:', error);
      toast.error('Failed to update invitation status');
      return false;
    }
  };

  return {
    invitations,
    loading,
    refetch: fetchInvitations,
    sendInvitation,
    sendBulkInvitations,
    respondToInvitation,
    updateInvitationStatus,
    getInvitationsForProject,
    getInvitationsForPersonnel,
    getPendingInvitationsForPersonnel,
  };
}
