import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ProjectCalendarItem {
  id: string;
  date: string;
  description: string;
  isMilestone?: boolean;
}

export interface Project {
  id: string;
  name: string;
  status: 'active' | 'completed' | 'pending';
  description: string;
  startDate: string;
  endDate?: string;
  assignedPersonnel: string[];
  calendarItems?: ProjectCalendarItem[];
  customer?: string;
  workCategory?: string;
  projectNumber?: string;
  location?: string;
  projectManager?: string;
  isPosted?: boolean;
  imageUrl?: string;
  projectCountry?: string;
  projectLocationLabel?: string;
  visibilityMode?: 'same_country' | 'all';
  includeCountries?: string[];
  excludeCountries?: string[];
}

interface DbProject {
  id: string;
  business_id: string;
  name: string;
  description: string;
  status: string;
  start_date: string;
  end_date: string | null;
  assigned_personnel: string[];
  created_at: string;
  updated_at: string;
  customer: string | null;
  work_category: string | null;
  project_number: string | null;
  location: string | null;
  project_manager: string | null;
  is_posted: boolean;
  image_url: string | null;
  project_country: string | null;
  project_location_label: string | null;
  visibility_mode: string;
  include_countries: string[] | null;
  exclude_countries: string[] | null;
}

interface DbCalendarItem {
  id: string;
  project_id: string;
  date: string;
  description: string;
  is_milestone: boolean;
  created_at: string;
  updated_at: string;
}

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();

  const fetchProjects = useCallback(async () => {
    if (!profile?.business_id) {
      setProjects([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Fetch projects and calendar items in parallel (no waterfall)
      const [projectsResult, calendarResult] = await Promise.all([
        supabase.from('projects').select('*').order('created_at', { ascending: false }),
        supabase.from('project_calendar_items').select('*')
      ]);

      if (projectsResult.error) throw projectsResult.error;
      if (calendarResult.error) throw calendarResult.error;

      const projectsData = projectsResult.data;
      const calendarItemsData = calendarResult.data;

      if (!projectsData || projectsData.length === 0) {
        setProjects([]);
        setLoading(false);
        return;
      }

      const projectIds = new Set(projectsData.map((p: DbProject) => p.id));

      // Map to frontend format
      const mappedProjects: Project[] = projectsData.map((p: DbProject) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        status: p.status as 'active' | 'completed' | 'pending',
        startDate: p.start_date,
        endDate: p.end_date || undefined,
        assignedPersonnel: p.assigned_personnel || [],
        customer: p.customer || undefined,
        workCategory: p.work_category || undefined,
        projectNumber: p.project_number || undefined,
        location: p.location || undefined,
        projectManager: p.project_manager || undefined,
        isPosted: p.is_posted,
        imageUrl: p.image_url || undefined,
        projectCountry: p.project_country || undefined,
        projectLocationLabel: p.project_location_label || undefined,
        visibilityMode: (p.visibility_mode as 'same_country' | 'all') || 'same_country',
        includeCountries: p.include_countries || undefined,
        excludeCountries: p.exclude_countries || undefined,
        calendarItems: (calendarItemsData || [])
          .filter((item: DbCalendarItem) => projectIds.has(item.project_id) && item.project_id === p.id)
          .map((item: DbCalendarItem) => ({
            id: item.id,
            date: item.date,
            description: item.description,
            isMilestone: item.is_milestone,
          })),
      }));

      setProjects(mappedProjects);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, [profile?.business_id]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const addProject = async (project: Omit<Project, 'id' | 'calendarItems'>): Promise<Project | null> => {
    if (!profile?.business_id) {
      toast.error('No business associated with your account');
      return null;
    }

    const dedup = (arr: string[]) => [...new Set(arr.map(x => x.toLowerCase().trim()).filter(Boolean))];

    try {
      const { data, error } = await supabase
        .from('projects')
        .insert({
          business_id: profile.business_id,
          name: project.name,
          description: project.description,
          status: project.status,
          start_date: project.startDate,
          end_date: project.endDate || null,
          assigned_personnel: project.assignedPersonnel,
          customer: project.customer || null,
          work_category: project.workCategory || null,
          project_number: project.projectNumber || null,
          location: project.location || null,
          project_manager: project.projectManager || null,
          is_posted: project.isPosted || false,
          image_url: project.imageUrl || null,
          project_country: project.projectCountry?.toLowerCase().trim() || null,
          project_location_label: project.projectLocationLabel || null,
          visibility_mode: project.visibilityMode || 'same_country',
          include_countries: project.includeCountries ? dedup(project.includeCountries) : null,
          exclude_countries: project.excludeCountries ? dedup(project.excludeCountries) : null,
        })
        .select()
        .single();

      if (error) throw error;

      const newProject: Project = {
        id: data.id,
        name: data.name,
        description: data.description,
        status: data.status as 'active' | 'completed' | 'pending',
        startDate: data.start_date,
        endDate: data.end_date || undefined,
        assignedPersonnel: data.assigned_personnel || [],
        customer: data.customer || undefined,
        workCategory: data.work_category || undefined,
        projectNumber: data.project_number || undefined,
        location: data.location || undefined,
        projectManager: data.project_manager || undefined,
        isPosted: data.is_posted,
        imageUrl: data.image_url || undefined,
        projectCountry: data.project_country || undefined,
        projectLocationLabel: data.project_location_label || undefined,
        visibilityMode: (data.visibility_mode as 'same_country' | 'all') || 'same_country',
        includeCountries: data.include_countries || undefined,
        excludeCountries: data.exclude_countries || undefined,
        calendarItems: [],
      };

      setProjects((prev) => [newProject, ...prev]);
      toast.success('Project created successfully');
      return newProject;
    } catch (error) {
      console.error('Error adding project:', error);
      toast.error('Failed to create project');
      return null;
    }
  };

  const updateProject = async (project: Project): Promise<boolean> => {
    const dedup = (arr: string[]) => [...new Set(arr.map(x => x.toLowerCase().trim()).filter(Boolean))];
    try {
      const { error } = await supabase
        .from('projects')
        .update({
          name: project.name,
          description: project.description,
          status: project.status,
          start_date: project.startDate,
          end_date: project.endDate || null,
          assigned_personnel: project.assignedPersonnel,
          customer: project.customer || null,
          work_category: project.workCategory || null,
          project_number: project.projectNumber || null,
          location: project.location || null,
          project_manager: project.projectManager || null,
          is_posted: project.isPosted || false,
          image_url: project.imageUrl || null,
          project_country: project.projectCountry?.toLowerCase().trim() || null,
          project_location_label: project.projectLocationLabel || null,
          visibility_mode: project.visibilityMode || 'same_country',
          include_countries: project.includeCountries ? dedup(project.includeCountries) : null,
          exclude_countries: project.excludeCountries ? dedup(project.excludeCountries) : null,
        })
        .eq('id', project.id);

      if (error) throw error;

      setProjects((prev) =>
        prev.map((p) => (p.id === project.id ? project : p))
      );
      return true;
    } catch (error) {
      console.error('Error updating project:', error);
      toast.error('Failed to update project');
      return false;
    }
  };

  const deleteProject = async (projectId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (error) throw error;

      setProjects((prev) => prev.filter((p) => p.id !== projectId));
      toast.success('Project deleted successfully');
      return true;
    } catch (error) {
      console.error('Error deleting project:', error);
      toast.error('Failed to delete project');
      return false;
    }
  };

  const addCalendarItem = async (
    projectId: string,
    item: Omit<ProjectCalendarItem, 'id'>
  ): Promise<ProjectCalendarItem | null> => {
    try {
      const { data, error } = await supabase
        .from('project_calendar_items')
        .insert({
          project_id: projectId,
          date: item.date,
          description: item.description,
          is_milestone: item.isMilestone || false,
        })
        .select()
        .single();

      if (error) throw error;

      const newItem: ProjectCalendarItem = {
        id: data.id,
        date: data.date,
        description: data.description,
        isMilestone: data.is_milestone,
      };

      setProjects((prev) =>
        prev.map((p) => {
          if (p.id === projectId) {
            return {
              ...p,
              calendarItems: [...(p.calendarItems || []), newItem],
            };
          }
          return p;
        })
      );

      toast.success('Calendar item added');
      return newItem;
    } catch (error) {
      console.error('Error adding calendar item:', error);
      toast.error('Failed to add calendar item');
      return null;
    }
  };

  const removeCalendarItem = async (
    projectId: string,
    itemId: string
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('project_calendar_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      setProjects((prev) =>
        prev.map((p) => {
          if (p.id === projectId) {
            return {
              ...p,
              calendarItems: (p.calendarItems || []).filter(
                (item) => item.id !== itemId
              ),
            };
          }
          return p;
        })
      );

      toast.success('Calendar item removed');
      return true;
    } catch (error) {
      console.error('Error removing calendar item:', error);
      toast.error('Failed to remove calendar item');
      return false;
    }
  };

  return {
    projects,
    loading,
    refetch: fetchProjects,
    addProject,
    updateProject,
    deleteProject,
    addCalendarItem,
    removeCalendarItem,
  };
}
