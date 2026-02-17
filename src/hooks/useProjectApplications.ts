import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ProjectApplication {
  id: string;
  projectId: string;
  personnelId: string;
  businessId: string;
  status: string;
  initialMessage: string;
  createdAt: string;
  updatedAt: string;
  acceptedAt?: string;
  rejectedAt?: string;
  // Joined fields
  personnelName?: string;
  personnelRole?: string;
  personnelEmail?: string;
  personnelAvatarUrl?: string;
}

export function useProjectApplications(projectId?: string) {
  const [applications, setApplications] = useState<ProjectApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, profile } = useAuth();

  const fetchApplications = useCallback(async () => {
    if (!projectId) {
      setApplications([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('project_applications')
        .select('*, personnel:personnel_id(name, role, email, avatar_url)')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mapped: ProjectApplication[] = (data || []).map((a: any) => ({
        id: a.id,
        projectId: a.project_id,
        personnelId: a.personnel_id,
        businessId: a.business_id,
        status: a.status,
        initialMessage: a.initial_message,
        createdAt: a.created_at,
        updatedAt: a.updated_at,
        acceptedAt: a.accepted_at || undefined,
        rejectedAt: a.rejected_at || undefined,
        personnelName: a.personnel?.name,
        personnelRole: a.personnel?.role,
        personnelEmail: a.personnel?.email,
        personnelAvatarUrl: a.personnel?.avatar_url,
      }));

      setApplications(mapped);
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const submitApplication = async (
    projectId: string,
    personnelId: string,
    businessId: string,
    message: string
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('project_applications')
        .insert({
          project_id: projectId,
          personnel_id: personnelId,
          business_id: businessId,
          initial_message: message,
        });

      if (error) {
        if (error.code === '23505') {
          toast.error('You have already applied to this project');
        } else {
          throw error;
        }
        return false;
      }

      toast.success('Application submitted successfully');
      return true;
    } catch (error) {
      console.error('Error submitting application:', error);
      toast.error('Failed to submit application');
      return false;
    }
  };

  const updateApplicationStatus = async (
    applicationId: string,
    status: 'accepted' | 'rejected'
  ): Promise<boolean> => {
    try {
      const updateData: any = {
        status,
        ...(status === 'accepted' ? { accepted_at: new Date().toISOString() } : {}),
        ...(status === 'rejected' ? { rejected_at: new Date().toISOString() } : {}),
      };

      const { error } = await supabase
        .from('project_applications')
        .update(updateData)
        .eq('id', applicationId);

      if (error) throw error;

      toast.success(`Application ${status}`);
      fetchApplications();
      return true;
    } catch (error) {
      console.error('Error updating application:', error);
      toast.error('Failed to update application');
      return false;
    }
  };

  // Worker: get own applications across projects
  const getMyApplications = useCallback(async (personnelId: string) => {
    try {
      const { data, error } = await supabase
        .from('project_applications')
        .select('*')
        .eq('personnel_id', personnelId);

      if (error) throw error;
      return (data || []).map((a: any) => ({
        id: a.id,
        projectId: a.project_id,
        personnelId: a.personnel_id,
        businessId: a.business_id,
        status: a.status,
        initialMessage: a.initial_message,
        createdAt: a.created_at,
        updatedAt: a.updated_at,
      }));
    } catch (error) {
      console.error('Error fetching my applications:', error);
      return [];
    }
  }, []);

  return {
    applications,
    loading,
    refetch: fetchApplications,
    submitApplication,
    updateApplicationStatus,
    getMyApplications,
  };
}
