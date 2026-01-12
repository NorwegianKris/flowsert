-- Add role column to invitations table (nullable for admin invitations that don't need personnel_id)
ALTER TABLE public.invitations 
ADD COLUMN IF NOT EXISTS role app_role NOT NULL DEFAULT 'worker'::app_role;

-- Make personnel_id nullable (admin invitations don't need a personnel record)
ALTER TABLE public.invitations 
ALTER COLUMN personnel_id DROP NOT NULL;

-- Update the handle_new_user function to use the role from invitation
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _business_id UUID;
  _role app_role;
  _invitation RECORD;
BEGIN
  -- Check if there's an invitation for this email
  SELECT * INTO _invitation 
  FROM public.invitations 
  WHERE email = NEW.email 
    AND status = 'pending' 
    AND expires_at > now()
  LIMIT 1;

  IF _invitation IS NOT NULL THEN
    -- User invited by admin - use the role specified in the invitation
    _business_id := _invitation.business_id;
    _role := _invitation.role;
    
    -- Update invitation status
    UPDATE public.invitations SET status = 'accepted' WHERE id = _invitation.id;
    
    -- Link personnel record if this is a worker invitation
    IF _invitation.personnel_id IS NOT NULL THEN
      UPDATE public.personnel SET user_id = NEW.id WHERE id = _invitation.personnel_id;
    END IF;
  ELSE
    -- New business admin signup
    INSERT INTO public.businesses (name) VALUES ('My Business') RETURNING id INTO _business_id;
    _role := 'admin'::app_role;
  END IF;

  -- Create profile
  INSERT INTO public.profiles (id, email, full_name, business_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    _business_id
  );

  -- Assign role
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role);

  RETURN NEW;
END;
$function$;