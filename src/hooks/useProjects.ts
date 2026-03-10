import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { addDays } from 'date-fns';

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
  isRecurring?: boolean;
  recurringIntervalDays?: number;
  recurringIntervalLabel?: string;
  recurringNextDate?: string;
  // Rotation schedule fields
  rotationOnDays?: number;
  rotationOffDays?: number;
  rotationCount?: number;
  rotationsCompleted?: number;
  autoCloseEnabled?: boolean;
  nextCloseDate?: string;
  nextOpenDate?: string;
  // Back-to-back shift fields
  isShiftParent?: boolean;
  shiftGroupId?: string;
  shiftNumber?: number;
  groupColor?: string;
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
  is_recurring: boolean;
  recurring_interval_days: number | null;
  recurring_interval_label: string | null;
  recurring_next_date: string | null;
  // Rotation
  rotation_on_days: number | null;
  rotation_off_days: number | null;
  rotation_count: number | null;
  rotations_completed: number | null;
  auto_close_enabled: boolean;
  next_close_date: string | null;
  next_open_date: string | null;
  // Shifts
  is_shift_parent: boolean;
  shift_group_id: string | null;
  shift_number: number | null;
  group_color: string | null;
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

function mapDbToProject(p: DbProject, calendarItems: DbCalendarItem[]): Project {
  return {
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
    isRecurring: p.is_recurring,
    recurringIntervalDays: p.recurring_interval_days || undefined,
    recurringIntervalLabel: p.recurring_interval_label || undefined,
    recurringNextDate: p.recurring_next_date || undefined,
    // Rotation
    rotationOnDays: p.rotation_on_days || undefined,
    rotationOffDays: p.rotation_off_days || undefined,
    rotationCount: p.rotation_count || undefined,
    rotationsCompleted: p.rotations_completed || undefined,
    autoCloseEnabled: p.auto_close_enabled,
    nextCloseDate: p.next_close_date || undefined,
    nextOpenDate: p.next_open_date || undefined,
    // Shifts
    isShiftParent: p.is_shift_parent,
    shiftGroupId: p.shift_group_id || undefined,
    shiftNumber: p.shift_number || undefined,
    calendarItems: calendarItems
      .filter(item => item.project_id === p.id)
      .map(item => ({
        id: item.id,
        date: item.date,
        description: item.description,
        isMilestone: item.is_milestone,
      })),
  };
}

function buildInsertPayload(
  project: Omit<Project, 'id' | 'calendarItems'>,
  businessId: string,
  overrides?: Partial<Record<string, unknown>>
) {
  const dedup = (arr: string[]) => [...new Set(arr.map(x => x.toLowerCase().trim()).filter(Boolean))];
  return {
    business_id: businessId,
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
    is_recurring: project.isRecurring || false,
    recurring_interval_days: project.isRecurring ? (project.recurringIntervalDays || null) : null,
    recurring_interval_label: project.isRecurring ? (project.recurringIntervalLabel || null) : null,
    recurring_next_date: project.isRecurring ? (project.recurringNextDate || null) : null,
    // Rotation
    rotation_on_days: project.rotationOnDays || null,
    rotation_off_days: project.rotationOffDays || null,
    rotation_count: project.rotationCount || null,
    rotations_completed: project.rotationsCompleted || 0,
    auto_close_enabled: project.autoCloseEnabled || false,
    next_close_date: project.nextCloseDate || null,
    next_open_date: project.nextOpenDate || null,
    // Shifts
    is_shift_parent: project.isShiftParent || false,
    shift_group_id: project.shiftGroupId || null,
    shift_number: project.shiftNumber || null,
    ...overrides,
  };
}

async function notifyWorkersAboutPostedProject(
  projectId: string,
  projectName: string,
  businessId: string,
  projectCountry: string | undefined,
  visibilityMode: string,
  includeCountries: string[] | undefined,
  excludeCountries: string[] | undefined,
) {
  try {
    const { data: allPersonnel, error: personnelError } = await supabase
      .from('personnel')
      .select('id, country, user_id')
      .eq('business_id', businessId)
      .not('user_id', 'is', null);

    if (personnelError || !allPersonnel) {
      console.error('Failed to fetch personnel for notification:', personnelError);
      return;
    }

    const normalize = (s: string | null | undefined) => (s || '').toLowerCase().trim();
    const normalizedExclude = (excludeCountries || []).map(c => normalize(c));
    const normalizedInclude = (includeCountries || []).map(c => normalize(c));
    const normalizedProjectCountry = normalize(projectCountry);

    const eligiblePersonnel = allPersonnel.filter(p => {
      const workerCountry = normalize(p.country);
      if (workerCountry && normalizedExclude.includes(workerCountry)) return false;
      if (visibilityMode === 'all') return true;
      if (workerCountry === normalizedProjectCountry) return true;
      if (workerCountry && normalizedInclude.includes(workerCountry)) return true;
      return false;
    });

    if (eligiblePersonnel.length === 0) return;

    const { data: { user } } = await supabase.auth.getUser();
    const { data: notification, error: notifError } = await supabase
      .from('notifications')
      .insert({
        business_id: businessId,
        subject: `New project opportunity: ${projectName}`,
        message: `A new project "${projectName}" has been posted. Check your Posted Projects to learn more and apply.`,
        created_by: user?.id || null,
      })
      .select('id')
      .single();

    if (notifError || !notification) {
      console.error('Failed to create notification:', notifError);
      return;
    }

    const recipients = eligiblePersonnel.map(p => ({
      notification_id: notification.id,
      personnel_id: p.id,
    }));

    const { error: recipientError } = await supabase
      .from('notification_recipients')
      .insert(recipients);

    if (recipientError) {
      console.error('Failed to insert notification recipients:', recipientError);
    } else {
      console.log(`Notified ${recipients.length} workers about posted project "${projectName}"`);
    }
  } catch (err) {
    console.error('Error sending posted project notifications:', err);
  }
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
      
      const [projectsResult, calendarResult] = await Promise.all([
        supabase.from('projects').select('*').order('created_at', { ascending: false }),
        supabase.from('project_calendar_items').select('*')
      ]);

      if (projectsResult.error) throw projectsResult.error;
      if (calendarResult.error) throw calendarResult.error;

      const projectsData = projectsResult.data;
      const calendarItemsData = calendarResult.data || [];

      if (!projectsData || projectsData.length === 0) {
        setProjects([]);
        setLoading(false);
        return;
      }

      const mappedProjects: Project[] = projectsData.map((p: DbProject) =>
        mapDbToProject(p, calendarItemsData as DbCalendarItem[])
      );

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
      const payload = buildInsertPayload(project, profile.business_id);

      const { data, error } = await supabase
        .from('projects')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;

      const newProject = mapDbToProject(data as DbProject, []);

      // If back-to-back shifts enabled, create sibling shift projects
      const shiftPersonnel: Record<number, { assigned: string[]; invited: string[] }> | undefined =
        (project as any)._shiftPersonnel;
      
      const createdProjects: Project[] = [newProject];
      const createdShifts: { shiftNumber: number; projectId: string }[] = [
        { shiftNumber: 1, projectId: newProject.id },
      ];

      // Create sibling shifts if this is a shift parent
      if (project.isShiftParent && project.shiftNumber === 1 && project.rotationOnDays) {
        // Update parent with shift_group_id = its own id and name suffix
        const parentName = project.name;
        const shiftGroupId = newProject.id;
        
        await supabase.from('projects').update({
          shift_group_id: shiftGroupId,
          name: `${parentName} — Shift 1`,
        }).eq('id', newProject.id);

        newProject.shiftGroupId = shiftGroupId;
        newProject.name = `${parentName} — Shift 1`;

        const totalShifts = (project as any)._shiftCount || 2;

        for (let n = 2; n <= totalShifts; n++) {
          const offsetDays = (n - 1) * project.rotationOnDays;
          const shiftStartDate = addDays(new Date(project.startDate), offsetDays)
            .toISOString().split('T')[0];
          const shiftEndDate = project.endDate
            ? addDays(new Date(project.endDate), offsetDays).toISOString().split('T')[0]
            : null;

          // Get per-shift personnel if provided
          const shiftAssigned = shiftPersonnel?.[n]?.assigned || [];

          const siblingPayload = buildInsertPayload(
            {
              ...project,
              name: `${parentName} — Shift ${n}`,
              startDate: shiftStartDate,
              endDate: shiftEndDate || undefined,
              assignedPersonnel: shiftAssigned,
              isShiftParent: false,
              shiftGroupId: shiftGroupId,
              shiftNumber: n,
              nextCloseDate: project.autoCloseEnabled && project.rotationOnDays
                ? addDays(new Date(shiftStartDate), project.rotationOnDays).toISOString()
                : undefined,
              nextOpenDate: project.autoCloseEnabled && project.rotationOnDays && project.rotationOffDays
                ? addDays(new Date(shiftStartDate), project.rotationOnDays + project.rotationOffDays).toISOString()
                : undefined,
            },
            profile.business_id,
            {
              shift_group_id: shiftGroupId,
              shift_number: n,
              is_shift_parent: false,
            }
          );

          const { data: siblingData, error: siblingError } = await supabase
            .from('projects')
            .insert(siblingPayload)
            .select()
            .single();

          if (siblingError) {
            console.error(`Failed to create shift ${n}:`, siblingError);
          } else {
            const siblingProject = mapDbToProject(siblingData as DbProject, []);
            createdProjects.push(siblingProject);
            createdShifts.push({ shiftNumber: n, projectId: siblingProject.id });
          }
        }
      }

      setProjects((prev) => [...createdProjects, ...prev]);
      toast.success(createdProjects.length > 1
        ? `Created ${createdProjects.length} shift projects`
        : 'Project created successfully');

      // Send notifications if project is posted
      if (newProject.isPosted && profile.business_id) {
        notifyWorkersAboutPostedProject(
          newProject.id, newProject.name, profile.business_id,
          newProject.projectCountry, newProject.visibilityMode || 'same_country',
          newProject.includeCountries, newProject.excludeCountries,
        );
      }

      // Attach created shift info for dialog to send per-shift invitations
      if (createdShifts.length > 1) {
        (newProject as any)._createdShifts = createdShifts;
      }

      return newProject;
    } catch (error) {
      console.error('Error adding project:', error);
      toast.error('Failed to create project');
      return null;
    }
  };

  const updateProject = async (project: Project, previouslyPosted?: boolean): Promise<boolean> => {
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
          is_recurring: project.isRecurring || false,
          recurring_interval_days: project.isRecurring ? (project.recurringIntervalDays || null) : null,
          recurring_interval_label: project.isRecurring ? (project.recurringIntervalLabel || null) : null,
          recurring_next_date: project.isRecurring ? (project.recurringNextDate || null) : null,
          // Rotation
          rotation_on_days: project.rotationOnDays || null,
          rotation_off_days: project.rotationOffDays || null,
          rotation_count: project.rotationCount || null,
          auto_close_enabled: project.autoCloseEnabled || false,
          next_close_date: project.nextCloseDate || null,
          next_open_date: project.nextOpenDate || null,
        })
        .eq('id', project.id);

      if (error) throw error;

      setProjects((prev) =>
        prev.map((p) => (p.id === project.id ? project : p))
      );

      if (project.isPosted && !previouslyPosted && profile?.business_id) {
        notifyWorkersAboutPostedProject(
          project.id, project.name, profile.business_id,
          project.projectCountry, project.visibilityMode || 'same_country',
          project.includeCountries, project.excludeCountries,
        );
      }

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
