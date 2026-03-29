-- Fix 1: Restrict usage_ledger SELECT to admins/managers only
DROP POLICY IF EXISTS "usage_ledger_read_own" ON public.usage_ledger;
CREATE POLICY "usage_ledger_read_own" ON public.usage_ledger
  FOR SELECT
  TO authenticated
  USING (
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
    AND business_id = get_user_business_id(auth.uid())
  );

-- Fix 2: Restrict project_invitations admin SELECT policy to admins/managers only
DROP POLICY IF EXISTS "Admins can view all project invitations" ON public.project_invitations;
CREATE POLICY "Admins can view all project invitations" ON public.project_invitations
  FOR SELECT
  TO authenticated
  USING (
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
    AND EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_invitations.project_id
        AND p.business_id = get_user_business_id(auth.uid())
    )
  );