import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ProjectCalendarItem {
  id: string;
  date: string;
  description: string;
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
}

interface DbCalendarItem {
  id: string;
  project_id: string;
  date: string;
  description: string;
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
      
      // Fetch projects
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (projectsError) throw projectsError;

      if (!projectsData || projectsData.length === 0) {
        setProjects([]);
        setLoading(false);
        return;
      }

      // Fetch calendar items for all projects
      const projectIds = projectsData.map((p: DbProject) => p.id);
      const { data: calendarItemsData, error: calendarError } = await supabase
        .from('project_calendar_items')
        .select('*')
        .in('project_id', projectIds);

      if (calendarError) throw calendarError;

      // Map to frontend format
      const mappedProjects: Project[] = projectsData.map((p: DbProject) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        status: p.status as 'active' | 'completed' | 'pending',
        startDate: p.start_date,
        endDate: p.end_date || undefined,
        assignedPersonnel: p.assigned_personnel || [],
        calendarItems: (calendarItemsData || [])
          .filter((item: DbCalendarItem) => item.project_id === p.id)
          .map((item: DbCalendarItem) => ({
            id: item.id,
            date: item.date,
            description: item.description,
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
        })
        .select()
        .single();

      if (error) throw error;

      const newItem: ProjectCalendarItem = {
        id: data.id,
        date: data.date,
        description: data.description,
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
