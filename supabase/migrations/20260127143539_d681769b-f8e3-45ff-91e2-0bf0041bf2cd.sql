-- Update handle_new_user to reject sign-ups without valid invitations (private intranet)
-- Job seeker registrations with valid tokens will still work

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  _business_id UUID;
  _role app_role;
  _invitation RECORD;
  _invite_token TEXT;
  _job_seeker_token TEXT;
  _job_seeker_invitation RECORD;
  _job_seeker_role TEXT;
BEGIN
  -- First, check for job seeker token (this flow is preserved)
  _job_seeker_token := NEW.raw_user_meta_data ->> 'job_seeker_token';
  
  IF _job_seeker_token IS NOT NULL AND _job_seeker_token != '' THEN
    SELECT * INTO _job_seeker_invitation 
    FROM public.job_seeker_invitations 
    WHERE token = _job_seeker_token
      AND is_active = true;
      
    IF _job_seeker_invitation IS NOT NULL THEN
      _business_id := _job_seeker_invitation.business_id;
      _role := 'worker'::app_role;
      
      -- Get job seeker role from metadata, default to 'Job Seeker' if not provided
      _job_seeker_role := COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'job_seeker_role', ''), 'Job Seeker');
      
      -- Create personnel record for job seeker with activated=true by default
      INSERT INTO public.personnel (
        name,
        email,
        phone,
        role,
        location,
        business_id,
        user_id,
        is_job_seeker,
        activated
      ) VALUES (
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
        NEW.email,
        '',
        _job_seeker_role,
        'Not specified',
        _business_id,
        NEW.id,
        true,
        true  -- Activated by default for admin visibility
      );
      
      -- Create profile
      INSERT INTO public.profiles (id, email, full_name, business_id)
      VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
        _business_id
      );

      -- Assign worker role
      INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role);

      RETURN NEW;
    END IF;
  END IF;

  -- Standard invitation flow
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
    _business_id := _invitation.business_id;
    _role := _invitation.role;
    
    -- Link personnel record if exists
    IF _invitation.personnel_id IS NOT NULL THEN
      UPDATE public.personnel
      SET user_id = NEW.id
      WHERE id = _invitation.personnel_id;
    END IF;
    
    -- Mark invitation as used
    UPDATE public.invitations
    SET status = 'accepted'
    WHERE id = _invitation.id;
  ELSE
    -- SECURITY: Reject sign-ups without valid invitations (private intranet model)
    -- This prevents random people from creating admin accounts
    RAISE EXCEPTION 'Registration requires a valid invitation. Please contact an administrator to request access.';
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