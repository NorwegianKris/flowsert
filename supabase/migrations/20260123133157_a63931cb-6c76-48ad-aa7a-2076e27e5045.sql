-- Update the handle_new_user function to use job_seeker_role from metadata instead of hardcoded 'Job Seeker'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _business_id UUID;
  _role app_role;
  _invitation RECORD;
  _invite_token TEXT;
  _job_seeker_token TEXT;
  _job_seeker_invitation RECORD;
  _job_seeker_role TEXT;
BEGIN
  -- First, check for job seeker token
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
      
      -- Create personnel record for job seeker
      INSERT INTO public.personnel (
        name,
        email,
        phone,
        role,
        location,
        business_id,
        user_id,
        is_job_seeker
      ) VALUES (
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
        NEW.email,
        '',
        _job_seeker_role,
        'Not specified',
        _business_id,
        NEW.id,
        true
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
    -- No invitation - create new business
    INSERT INTO public.businesses (name)
    VALUES (COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email) || '''s Business')
    RETURNING id INTO _business_id;
    
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

-- Create a public function to fetch worker categories by business_id from job seeker token
-- This allows unauthenticated users to see available roles during registration
CREATE OR REPLACE FUNCTION public.get_worker_categories_for_job_seeker_token(lookup_token text)
RETURNS TABLE(id uuid, name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    wc.id,
    wc.name
  FROM public.worker_categories wc
  JOIN public.job_seeker_invitations jsi ON jsi.business_id = wc.business_id
  WHERE jsi.token = lookup_token
    AND jsi.is_active = true
  ORDER BY wc.name;
END;
$$;