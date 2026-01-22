-- Add is_job_seeker flag to personnel table
ALTER TABLE public.personnel 
ADD COLUMN is_job_seeker BOOLEAN NOT NULL DEFAULT false;

-- Create job_seeker_invitations table for public signup links
CREATE TABLE public.job_seeker_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL,
  token TEXT NOT NULL DEFAULT encode(extensions.gen_random_bytes(32), 'hex'::text),
  name TEXT NOT NULL DEFAULT 'Default',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(token)
);

-- Enable RLS
ALTER TABLE public.job_seeker_invitations ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Require authentication for job_seeker_invitations"
  ON public.job_seeker_invitations
  AS RESTRICTIVE
  FOR ALL
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can view job seeker invitations for their business"
  ON public.job_seeker_invitations
  FOR SELECT
  USING (business_id = get_user_business_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert job seeker invitations for their business"
  ON public.job_seeker_invitations
  FOR INSERT
  WITH CHECK (business_id = get_user_business_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update job seeker invitations for their business"
  ON public.job_seeker_invitations
  FOR UPDATE
  USING (business_id = get_user_business_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete job seeker invitations for their business"
  ON public.job_seeker_invitations
  FOR DELETE
  USING (business_id = get_user_business_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role));

-- Create function to validate job seeker token (public access)
CREATE OR REPLACE FUNCTION public.get_job_seeker_invitation_by_token(lookup_token text)
RETURNS TABLE(id uuid, business_id uuid, name text, is_active boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    jsi.id,
    jsi.business_id,
    jsi.name,
    jsi.is_active
  FROM public.job_seeker_invitations jsi
  WHERE jsi.token = lookup_token
    AND jsi.is_active = true;
END;
$$;

-- Update handle_new_user to support job seeker signups
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
  _job_seeker_token TEXT;
  _job_seeker_invitation RECORD;
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
        'Job Seeker',
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