-- Fix 1: Harden worker UPDATE policy on personnel to prevent business_id changes
DROP POLICY IF EXISTS "Workers can update their own personnel record" ON public.personnel;

CREATE POLICY "Workers can update their own personnel record"
ON public.personnel FOR UPDATE
USING (
  auth.uid() IS NOT NULL
  AND has_role(auth.uid(), 'worker'::app_role)
  AND user_id = auth.uid()
)
WITH CHECK (
  auth.uid() IS NOT NULL
  AND has_role(auth.uid(), 'worker'::app_role)
  AND user_id = auth.uid()
  AND business_id = get_user_business_id(auth.uid())
);

-- Fix 2: Harden is_superadmin to use auth.jwt() email claim instead of mutable profiles table
CREATE OR REPLACE FUNCTION public.is_superadmin(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN _user_id IS NULL THEN FALSE
    WHEN _user_id = auth.uid() THEN
      -- Use the JWT email claim (immutable, verified by auth) instead of the mutable profiles table
      COALESCE(auth.jwt() ->> 'email', '') IN ('kmu@live.no', 'hello@flowsert.com')
    ELSE
      -- Fallback for service_role or cross-user checks: verify against auth-controlled email
      EXISTS (
        SELECT 1 FROM auth.users u
        WHERE u.id = _user_id
          AND u.email IN ('kmu@live.no', 'hello@flowsert.com')
      )
  END
$$;