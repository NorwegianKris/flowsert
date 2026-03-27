
-- ============================================================
-- FIX 1: Prevent superadmin email escalation
-- Add a trigger that prevents users from changing their email
-- in the profiles table via direct UPDATE.
-- ============================================================

CREATE OR REPLACE FUNCTION public.prevent_email_change()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = 'public'
AS $$
BEGIN
  -- Only allow email changes from service_role (triggers, admin operations)
  -- Regular users cannot change their profile email
  IF OLD.email IS DISTINCT FROM NEW.email THEN
    IF current_setting('request.jwt.claim.role', true) IS DISTINCT FROM 'service_role' THEN
      RAISE EXCEPTION 'EMAIL_CHANGE_NOT_ALLOWED: Profile email cannot be changed directly'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_email_change_trigger ON public.profiles;
CREATE TRIGGER prevent_email_change_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_email_change();

-- ============================================================
-- FIX 2: Add admin/manager role gate to project_phases mutations
-- ============================================================

-- Drop existing mutation policies on project_phases
DROP POLICY IF EXISTS "Admins can insert phases" ON public.project_phases;
DROP POLICY IF EXISTS "Admins can update phases" ON public.project_phases;
DROP POLICY IF EXISTS "Admins can delete phases" ON public.project_phases;

-- Recreate with proper role checks
CREATE POLICY "Admins can insert phases" ON public.project_phases
  FOR INSERT TO authenticated
  WITH CHECK (
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
    AND EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_phases.project_id
        AND p.business_id = get_user_business_id(auth.uid())
    )
  );

CREATE POLICY "Admins can update phases" ON public.project_phases
  FOR UPDATE TO authenticated
  USING (
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
    AND EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_phases.project_id
        AND p.business_id = get_user_business_id(auth.uid())
    )
  );

CREATE POLICY "Admins can delete phases" ON public.project_phases
  FOR DELETE TO authenticated
  USING (
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
    AND EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_phases.project_id
        AND p.business_id = get_user_business_id(auth.uid())
    )
  );

-- ============================================================
-- FIX 3: Add admin/manager role gate to project_invitations mutations
-- ============================================================

-- Drop existing admin mutation policies on project_invitations
DROP POLICY IF EXISTS "Admins can create project invitations" ON public.project_invitations;
DROP POLICY IF EXISTS "Admins can update project invitations" ON public.project_invitations;
DROP POLICY IF EXISTS "Admins can delete project invitations" ON public.project_invitations;

-- Recreate with proper role checks
CREATE POLICY "Admins can create project invitations" ON public.project_invitations
  FOR INSERT TO authenticated
  WITH CHECK (
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
    AND EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_invitations.project_id
        AND p.business_id = get_user_business_id(auth.uid())
    )
  );

CREATE POLICY "Admins can update project invitations" ON public.project_invitations
  FOR UPDATE TO authenticated
  USING (
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
    AND EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_invitations.project_id
        AND p.business_id = get_user_business_id(auth.uid())
    )
  );

CREATE POLICY "Admins can delete project invitations" ON public.project_invitations
  FOR DELETE TO authenticated
  USING (
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
    AND EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_invitations.project_id
        AND p.business_id = get_user_business_id(auth.uid())
    )
  );
