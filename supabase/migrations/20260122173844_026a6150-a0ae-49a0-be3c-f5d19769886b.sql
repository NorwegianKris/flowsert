-- Update handle_new_user to prioritize token-based invitation lookup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _business_id UUID;
  _role app_role;
  _invitation RECORD;
  _invite_token TEXT;
BEGIN
  -- First, try to find invitation by token (most reliable)
  _invite_token := NEW.raw_user_meta_data ->> 'invite_token';
  
  IF _invite_token IS NOT NULL AND _invite_token != '' THEN
    SELECT * INTO _invitation 
    FROM public.invitations 
    WHERE token = _invite_token
      AND status = 'pending' 
      AND expires_at > now();
  END IF;
  
  -- Fallback: find by email if no token provided
  IF _invitation IS NULL THEN
    SELECT * INTO _invitation 
    FROM public.invitations 
    WHERE email = NEW.email 
      AND status = 'pending' 
      AND expires_at > now()
    LIMIT 1;
  END IF;

  IF _invitation IS NOT NULL THEN
    -- Validate email matches if token was used
    IF _invite_token IS NOT NULL AND _invite_token != '' AND _invitation.email != NEW.email THEN
      RAISE EXCEPTION 'Email does not match invitation';
    END IF;
    
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
$$;