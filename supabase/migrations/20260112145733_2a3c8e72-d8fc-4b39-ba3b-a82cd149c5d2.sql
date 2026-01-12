-- Allow workers to view projects they have been invited to (pending, accepted, or declined)
CREATE POLICY "Workers can view projects they are invited to"
ON public.projects
FOR SELECT
USING (
  has_role(auth.uid(), 'worker'::app_role) AND
  EXISTS (
    SELECT 1 FROM project_invitations pi
    JOIN personnel per ON per.id = pi.personnel_id
    WHERE pi.project_id = projects.id
    AND per.user_id = auth.uid()
  )
);

-- Also allow workers to view projects they are assigned to
CREATE POLICY "Workers can view projects they are assigned to"
ON public.projects
FOR SELECT
USING (
  has_role(auth.uid(), 'worker'::app_role) AND
  EXISTS (
    SELECT 1 FROM personnel per
    WHERE per.user_id = auth.uid()
    AND per.id::text = ANY(projects.assigned_personnel)
  )
);