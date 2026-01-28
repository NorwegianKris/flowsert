-- Create a function to check if a user is the superadmin (kmu@live.no is the only superadmin)
-- This function checks by email address, which is immutable and secure
CREATE OR REPLACE FUNCTION public.is_superadmin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = _user_id
      AND p.email = 'kmu@live.no'
  )
$$;

-- Drop existing admin invitation policies
DROP POLICY IF EXISTS "Admins can create invitations for their business" ON public.invitations;
DROP POLICY IF EXISTS "Admins can update invitations for their business" ON public.invitations;
DROP POLICY IF EXISTS "Admins can view invitations for their business" ON public.invitations;

-- Create new policies: Only superadmin can manage admin invitations
CREATE POLICY "Superadmin can manage all invitations"
ON public.invitations
FOR ALL
USING (is_superadmin(auth.uid()))
WITH CHECK (is_superadmin(auth.uid()));

CREATE POLICY "Admins can create worker invitations only"
ON public.invitations
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin') 
  AND business_id = get_user_business_id(auth.uid())
  AND role = 'worker'::app_role
);

CREATE POLICY "Admins can view invitations for their business"
ON public.invitations
FOR SELECT
USING (
  has_role(auth.uid(), 'admin') 
  AND business_id = get_user_business_id(auth.uid())
);

CREATE POLICY "Admins can update worker invitations only"
ON public.invitations
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin') 
  AND business_id = get_user_business_id(auth.uid())
  AND role = 'worker'::app_role
);