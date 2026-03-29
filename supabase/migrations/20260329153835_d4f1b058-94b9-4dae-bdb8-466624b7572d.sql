CREATE OR REPLACE FUNCTION public.can_worker_access_project(_user_id uuid, _project_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_invitations pi
    JOIN personnel per ON per.id = pi.personnel_id
    WHERE pi.project_id = _project_id
    AND per.user_id = _user_id
    AND pi.status = 'accepted'
  )
  OR EXISTS (
    SELECT 1 FROM personnel per
    JOIN projects p ON per.id::text = ANY(p.assigned_personnel)
    WHERE per.user_id = _user_id
    AND p.id = _project_id
  )
$$;