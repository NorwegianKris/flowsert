-- Drop the problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Workers can view projects they are invited to" ON public.projects;
DROP POLICY IF EXISTS "Workers can view projects they are assigned to" ON public.projects;

-- Create a security definer function to check if a user can access a project
-- This avoids the infinite recursion by using security definer
CREATE OR REPLACE FUNCTION public.can_worker_access_project(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    -- Check if worker is invited to the project
    SELECT 1 FROM project_invitations pi
    JOIN personnel per ON per.id = pi.personnel_id
    WHERE pi.project_id = _project_id
    AND per.user_id = _user_id
  )
  OR EXISTS (
    -- Check if worker is assigned to the project
    SELECT 1 FROM personnel per
    JOIN projects p ON per.id::text = ANY(p.assigned_personnel)
    WHERE per.user_id = _user_id
    AND p.id = _project_id
  )
$$;

-- Create a single policy for workers to view projects they can access
CREATE POLICY "Workers can view accessible projects"
ON public.projects
FOR SELECT
USING (
  has_role(auth.uid(), 'worker'::app_role) AND
  can_worker_access_project(auth.uid(), id)
);