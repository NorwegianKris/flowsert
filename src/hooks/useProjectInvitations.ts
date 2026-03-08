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
  projectDescription?: string;
  projectStartDate?: string;
  projectEndDate?: string;
  projectLocation?: string;
  projectStatus?: string;
  projectNumber?: string;
  projectCustomer?: string;
  projectManager?: string;
  projectWorkCategory?: string;
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
          project:project_id (name, description, start_date, end_date, location, status, project_number, customer, project_manager, work_category),
          personnel:personnel_id (name)
        `)
        .order('invited_at', { ascending: false });

      if (error) throw error;

      const mappedInvitations: ProjectInvitation[] = (data || []).map((inv: any) => {
        // Normalize project payload: handle object, array, or null shapes
        const rawProject = inv.project ?? inv.projects ?? null;
        const project = Array.isArray(rawProject) ? rawProject[0] : rawProject;
        
        const rawPersonnel = inv.personnel ?? inv.person ?? null;
        const person = Array.isArray(rawPersonnel) ? rawPersonnel[0] : rawPersonnel;

        return {
          id: inv.id,
          projectId: inv.project_id,
          personnelId: inv.personnel_id,
          status: inv.status as 'pending' | 'accepted' | 'declined',
          invitedBy: inv.invited_by,
          invitedAt: inv.invited_at,
          respondedAt: inv.responded_at,
          projectName: project?.name ?? undefined,
          projectDescription: project?.description ?? undefined,
          projectStartDate: project?.start_date ?? undefined,
          projectEndDate: project?.end_date ?? undefined,
          projectLocation: project?.location ?? undefined,
          projectStatus: project?.status ?? undefined,
          projectNumber: project?.project_number ?? undefined,
          projectCustomer: project?.customer ?? undefined,
          projectManager: project?.project_manager ?? undefined,
          projectWorkCategory: project?.work_category ?? undefined,
          personnelName: person?.name ?? undefined,
        };
      });

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
    personnelId: string,
    personnelEmail?: string,
    personnelName?: string,
    projectDetails?: {
      name?: string;
      description?: string;
      startDate?: string;
      endDate?: string;
      location?: string;
      projectManager?: string;
    }
  ): Promise<boolean> => {
    try {
      // Check if an invitation already exists for this project/personnel combination
      const { data: existingInvitation } = await supabase
        .from('project_invitations')
        .select('id, status')
        .eq('project_id', projectId)
        .eq('personnel_id', personnelId)
        .maybeSingle();

      if (existingInvitation) {
        // If invitation exists and is pending, don't send again
        if (existingInvitation.status === 'pending') {
          toast.error('Invitation already pending for this personnel');
          return false;
        }
        
        // If invitation was declined or accepted, reset it to pending
        const { error: updateError } = await supabase
          .from('project_invitations')
          .update({
            status: 'pending',
            invited_at: new Date().toISOString(),
            invited_by: profile?.id,
            responded_at: null,
          })
          .eq('id', existingInvitation.id);

        if (updateError) throw updateError;
        
        // Send email notification for re-invitation
        if (personnelEmail && personnelName && projectDetails?.name) {
          await sendProjectInvitationEmail(
            personnelEmail,
            personnelName,
            projectDetails.name,
            projectDetails.description,
            projectDetails.startDate,
            projectDetails.endDate,
            projectDetails.location,
            projectDetails.projectManager
          );
        }
        
        await fetchInvitations();
        toast.success('Invitation re-sent successfully');
        return true;
      }

      // No existing invitation, create a new one
      const { error } = await supabase
        .from('project_invitations')
        .insert({
          project_id: projectId,
          personnel_id: personnelId,
          invited_by: profile?.id,
        });

      if (error) throw error;

      // Send email notification for new invitation
      if (personnelEmail && personnelName && projectDetails?.name) {
        await sendProjectInvitationEmail(
          personnelEmail,
          personnelName,
          projectDetails.name,
          projectDetails.description,
          projectDetails.startDate,
          projectDetails.endDate,
          projectDetails.location,
          projectDetails.projectManager
        );
      }

      await fetchInvitations();
      return true;
    } catch (error) {
      console.error('Error sending invitation:', error);
      toast.error('Failed to send invitation');
      return false;
    }
  };

  const sendProjectInvitationEmail = async (
    to: string,
    personnelName: string,
    projectName: string,
    projectDescription?: string,
    projectStartDate?: string,
    projectEndDate?: string,
    projectLocation?: string,
    projectManager?: string
  ) => {
    try {
      const { error } = await supabase.functions.invoke('send-project-invitation', {
        body: {
          to,
          personnelName,
          projectName,
          projectDescription,
          projectStartDate,
          projectEndDate,
          projectLocation,
          projectManager,
        },
      });

      if (error) {
        console.error('Failed to send invitation email:', error);
      } else {
        console.log('Project invitation email sent successfully');
      }
    } catch (error) {
      console.error('Error invoking send-project-invitation function:', error);
    }
  };

  const sendBulkInvitations = async (
    projectId: string,
    personnelIds: string[],
    personnelData?: Array<{ id: string; email: string; name: string }>,
    projectDetails?: {
      name?: string;
      description?: string;
      startDate?: string;
      endDate?: string;
      location?: string;
      projectManager?: string;
    }
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
          
          // Send email if personnel data and project details are provided
          const person = personnelData?.find(p => p.id === personnelId);
          if (person && projectDetails?.name) {
            await sendProjectInvitationEmail(
              person.email,
              person.name,
              projectDetails.name,
              projectDetails.description,
              projectDetails.startDate,
              projectDetails.endDate,
              projectDetails.location,
              projectDetails.projectManager
            );
          }
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
        // Use RPC function to add personnel to project (bypasses RLS safely)
        const { error: rpcError } = await supabase.rpc('add_personnel_to_project', {
          _project_id: invitation.project_id,
          _personnel_id: invitation.personnel_id,
        });

        if (rpcError) {
          console.error('RPC error adding personnel to project:', rpcError);
          // Don't throw - the invitation status is already updated
        }

        toast.success('Invitation accepted! You have been added to the project.');
      } else {
        // Use RPC function to remove personnel from project (bypasses RLS safely)
        const { error: rpcError } = await supabase.rpc('remove_personnel_from_project', {
          _project_id: invitation.project_id,
          _personnel_id: invitation.personnel_id,
        });

        if (rpcError) {
          console.error('RPC error removing personnel from project:', rpcError);
          // Don't throw - the invitation status is already updated
        }

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

      // Handle assigned_personnel updates based on status change using RPC functions
      if (newStatus === 'accepted') {
        // Use RPC function to add personnel to project
        const { error: rpcError } = await supabase.rpc('add_personnel_to_project', {
          _project_id: invitation.project_id,
          _personnel_id: invitation.personnel_id,
        });

        if (rpcError) {
          console.error('RPC error adding personnel to project:', rpcError);
        }
      } else if (oldStatus === 'accepted') {
        // Use RPC function to remove personnel from project (only if previously accepted)
        const { error: rpcError } = await supabase.rpc('remove_personnel_from_project', {
          _project_id: invitation.project_id,
          _personnel_id: invitation.personnel_id,
        });

        if (rpcError) {
          console.error('RPC error removing personnel from project:', rpcError);
        }
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
