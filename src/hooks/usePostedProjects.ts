import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface PostedProject {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate?: string;
  location?: string;
  workCategory?: string;
  projectManager?: string;
  status: string;
  imageUrl?: string;
  projectLocationLabel?: string;
  projectCountry?: string;
  businessName?: string;
  businessLogoUrl?: string;
}

export function usePostedProjects() {
  const [projects, setProjects] = useState<PostedProject[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchPostedProjects = useCallback(async () => {
    if (!user) {
      setProjects([]);
      setLoading(false);
      return;
    }

    try {
      // Fetch all posted projects in the worker's business
      const { data: personnelData } = await supabase
        .from('personnel')
        .select('business_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!personnelData?.business_id) {
        setProjects([]);
        setLoading(false);
        return;
      }

      const { data: businessData } = await supabase
        .from('businesses')
        .select('name, logo_url')
        .eq('id', personnelData.business_id)
        .maybeSingle();

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('business_id', personnelData.business_id)
        .eq('is_posted', true)
        .in('status', ['active', 'pending'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter using the security definer function
      const visibleProjects: PostedProject[] = [];
      for (const p of data || []) {
        const { data: canSee } = await supabase.rpc('can_worker_see_posted_project', {
          _user_id: user.id,
          _project_id: p.id,
        });
        if (canSee) {
          visibleProjects.push({
            id: p.id,
            name: p.name,
            description: p.description,
            startDate: p.start_date,
            endDate: p.end_date || undefined,
            location: p.location || undefined,
            workCategory: p.work_category || undefined,
            projectManager: p.project_manager || undefined,
            status: p.status,
            imageUrl: p.image_url || undefined,
            projectLocationLabel: p.project_location_label || undefined,
            projectCountry: p.project_country || undefined,
            businessName: businessData?.name || undefined,
            businessLogoUrl: businessData?.logo_url || undefined,
          });
        }
      }

      setProjects(visibleProjects);
    } catch (error) {
      console.error('Error fetching posted projects:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPostedProjects();
  }, [fetchPostedProjects]);

  return { projects, loading, refetch: fetchPostedProjects };
}
