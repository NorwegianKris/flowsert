-- Update the get_invitation_by_token function to include business name
-- This avoids the need for a separate query that fails due to RLS

DROP FUNCTION IF EXISTS public.get_invitation_by_token(text);

CREATE OR REPLACE FUNCTION public.get_invitation_by_token(lookup_token text)
RETURNS TABLE(
  id uuid, 
  email text, 
  role app_role, 
  business_id uuid, 
  status text, 
  expires_at timestamp with time zone, 
  personnel_id uuid,
  business_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    i.id,
    i.email,
    i.role,
    i.business_id,
    i.status,
    i.expires_at,
    i.personnel_id,
    b.name as business_name
  FROM public.invitations i
  JOIN public.businesses b ON b.id = i.business_id
  WHERE i.token = lookup_token
    AND i.status = 'pending'
    AND i.expires_at > now();
END;
$function$;