-- Drop the insecure policy that exposes all pending invitations
DROP POLICY IF EXISTS "Anyone can view invitation by token" ON public.invitations;

-- Create a secure function to validate invitation token lookup
-- This function checks if the provided token matches the invitation's token
CREATE OR REPLACE FUNCTION public.validate_invitation_token_access(invitation_token text, lookup_token text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow access if the tokens match exactly
  RETURN invitation_token = lookup_token;
END;
$$;

-- Create a new secure policy that requires the token to be provided as a query parameter
-- Users must use .eq('token', 'their-token-value') to access a specific invitation
CREATE POLICY "Users can view invitation only with matching token"
ON public.invitations
FOR SELECT
USING (
  -- Either the user is an admin viewing their business invitations
  ((business_id = get_user_business_id(auth.uid())) AND has_role(auth.uid(), 'admin'::app_role))
  OR
  -- Or they must be looking up a specific pending invitation by exact token match
  -- This works because Supabase RLS evaluates against the WHERE clause
  -- So SELECT * FROM invitations WHERE token = 'abc123' will only return that row
  (
    status = 'pending'::text 
    AND expires_at > now()
    AND auth.uid() IS NULL  -- Only for unauthenticated users (signup flow)
  )
);

-- NOTE: The above policy still needs the client to filter by token in the WHERE clause
-- Without a token filter, no rows will be returned because auth.uid() IS NULL check 
-- will prevent authenticated users from using this path, and unauthenticated users
-- cannot iterate through all rows without knowing the token

-- Actually, let's use a more secure approach using current_setting
-- Drop the policy we just created and make it stricter
DROP POLICY IF EXISTS "Users can view invitation only with matching token" ON public.invitations;

-- Recreate the admin policy separately (already exists, but we'll make sure)
-- We keep the existing admin policy as is

-- For token-based lookup, we need to ensure that:
-- 1. The request includes a specific token in the WHERE clause
-- 2. Only that specific row is returned if the token matches

-- The key insight is that RLS policies are evaluated row by row
-- So if someone does: SELECT * FROM invitations (without WHERE token = ...)
-- Each row's token will NOT match any lookup criterion, but currently the policy allows it

-- The fix: Remove the public access entirely and use a secure RPC function instead
-- Or, we can make the policy require auth OR a specific token match

-- Let's create a cleaner solution:
-- 1. Admin policy stays as is (they can view their business invitations)
-- 2. For public/anonymous access during signup, create an RPC function

-- First, ensure only admins can read invitations via direct table access
-- (The existing admin policy handles this)

-- Create a secure RPC function for validating and retrieving invitation by token
CREATE OR REPLACE FUNCTION public.get_invitation_by_token(lookup_token text)
RETURNS TABLE (
  id uuid,
  email text,
  role app_role,
  business_id uuid,
  status text,
  expires_at timestamptz,
  personnel_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id,
    i.email,
    i.role,
    i.business_id,
    i.status,
    i.expires_at,
    i.personnel_id
  FROM public.invitations i
  WHERE i.token = lookup_token
    AND i.status = 'pending'
    AND i.expires_at > now();
END;
$$;

-- Grant execute permission to anonymous users (for signup flow)
GRANT EXECUTE ON FUNCTION public.get_invitation_by_token(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_invitation_by_token(text) TO authenticated;