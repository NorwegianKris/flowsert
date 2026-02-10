
-- 1. Drop storage policies that depend on is_job_seeker_personnel
DROP POLICY IF EXISTS "Block job seeker certificate document downloads" ON storage.objects;
DROP POLICY IF EXISTS "Admins cannot view job seeker certificate documents" ON storage.objects;

-- 2. Rename table
ALTER TABLE job_seeker_invitations RENAME TO freelancer_invitations;

-- 3. Rename column
ALTER TABLE personnel RENAME COLUMN is_job_seeker TO is_freelancer;

-- 4. Drop old RLS policies on renamed table
DROP POLICY IF EXISTS "Admins can delete job seeker invitations for their business" ON freelancer_invitations;
DROP POLICY IF EXISTS "Admins can insert job seeker invitations for their business" ON freelancer_invitations;
DROP POLICY IF EXISTS "Admins can update job seeker invitations for their business" ON freelancer_invitations;
DROP POLICY IF EXISTS "Admins can view job seeker invitations for their business" ON freelancer_invitations;
DROP POLICY IF EXISTS "Require authentication for job_seeker_invitations" ON freelancer_invitations;

-- Recreate RLS policies with new names
CREATE POLICY "Admins can delete freelancer invitations for their business"
ON freelancer_invitations FOR DELETE
USING ((business_id = get_user_business_id(auth.uid())) AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert freelancer invitations for their business"
ON freelancer_invitations FOR INSERT
WITH CHECK ((business_id = get_user_business_id(auth.uid())) AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update freelancer invitations for their business"
ON freelancer_invitations FOR UPDATE
USING ((business_id = get_user_business_id(auth.uid())) AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view freelancer invitations for their business"
ON freelancer_invitations FOR SELECT
USING ((business_id = get_user_business_id(auth.uid())) AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Require authentication for freelancer_invitations"
ON freelancer_invitations FOR ALL
USING (auth.uid() IS NOT NULL);

-- 5. Drop and recreate functions with new names

DROP FUNCTION IF EXISTS get_job_seeker_invitation_by_token(text);
CREATE OR REPLACE FUNCTION get_freelancer_invitation_by_token(lookup_token text)
RETURNS TABLE(business_id uuid, id uuid, is_active boolean, name text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT fi.business_id, fi.id, fi.is_active, fi.name
  FROM freelancer_invitations fi
  WHERE fi.token = lookup_token;
END;
$$;

DROP FUNCTION IF EXISTS get_job_seeker_registration_by_code(text);
CREATE OR REPLACE FUNCTION get_freelancer_registration_by_code(lookup_code text)
RETURNS TABLE(business_id uuid, business_name text, token text)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT b.id as business_id, b.name as business_name, fi.token
  FROM businesses b
  JOIN freelancer_invitations fi ON fi.business_id = b.id
  WHERE b.company_code = upper(lookup_code)
    AND fi.is_active = true
  LIMIT 1;
$$;

DROP FUNCTION IF EXISTS get_worker_categories_for_job_seeker_token(text);
CREATE OR REPLACE FUNCTION get_worker_categories_for_freelancer_token(lookup_token text)
RETURNS TABLE(id uuid, name text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT wc.id, wc.name
  FROM worker_categories wc
  JOIN freelancer_invitations fi ON fi.business_id = wc.business_id
  WHERE fi.token = lookup_token AND fi.is_active = true
  ORDER BY wc.name;
END;
$$;

DROP FUNCTION IF EXISTS is_job_seeker_personnel(uuid);
CREATE OR REPLACE FUNCTION is_freelancer_personnel(_personnel_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT is_freelancer FROM public.personnel WHERE id = _personnel_id),
    FALSE
  )
$$;

-- 6. Recreate storage policies with new function name
CREATE POLICY "Block freelancer certificate document downloads"
ON storage.objects FOR SELECT
USING ((bucket_id <> 'certificate-documents'::text) OR (NOT is_freelancer_personnel(((storage.foldername(name))[1])::uuid)));

CREATE POLICY "Admins cannot view freelancer certificate documents"
ON storage.objects FOR SELECT
USING ((bucket_id = 'certificate-documents'::text) AND (NOT is_freelancer_personnel(((storage.foldername(name))[1])::uuid)) AND can_access_personnel(auth.uid(), ((storage.foldername(name))[1])::uuid));

-- 7. Update is_personnel_activated
CREATE OR REPLACE FUNCTION is_personnel_activated(_personnel_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT
      CASE
        WHEN is_freelancer = false THEN true
        ELSE activated
      END
    FROM personnel WHERE id = _personnel_id),
    false
  );
$$;

-- 8. Update handle_new_user trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _business_id UUID;
  _role app_role;
  _invitation RECORD;
  _invite_token TEXT;
  _job_seeker_token TEXT;
  _freelancer_invitation RECORD;
  _freelancer_role TEXT;
  _found_by_token BOOLEAN := FALSE;
BEGIN
  RAISE LOG 'handle_new_user: email=%, metadata=%', NEW.email, NEW.raw_user_meta_data::text;

  -- Check for freelancer token (metadata key stays as job_seeker_token for backward compat)
  _job_seeker_token := NEW.raw_user_meta_data ->> 'job_seeker_token';
  
  IF _job_seeker_token IS NOT NULL AND _job_seeker_token != '' THEN
    SELECT * INTO _freelancer_invitation 
    FROM public.freelancer_invitations 
    WHERE token = _job_seeker_token
      AND is_active = true;
      
    IF _freelancer_invitation.id IS NOT NULL THEN
      _business_id := _freelancer_invitation.business_id;
      _role := 'worker'::app_role;
      
      _freelancer_role := COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'job_seeker_role', ''), 'Freelancer');
      
      INSERT INTO public.personnel (
        name, email, phone, role, location, business_id, user_id, is_freelancer, activated, category
      ) VALUES (
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
        NEW.email, '', _freelancer_role, 'Not specified',
        _business_id, NEW.id, true, true, 'freelancer'
      );
      
      INSERT INTO public.profiles (id, email, full_name, business_id)
      VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email), _business_id);

      INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role);
      RETURN NEW;
    END IF;
  END IF;

  -- Standard invitation flow
  _invite_token := NEW.raw_user_meta_data ->> 'invite_token';
  RAISE LOG 'handle_new_user: invite_token=%', _invite_token;
  
  IF _invite_token IS NOT NULL AND _invite_token != '' THEN
    SELECT * INTO _invitation 
    FROM public.invitations 
    WHERE token = _invite_token AND status = 'pending' AND expires_at > now();
    
    IF _invitation.id IS NOT NULL THEN
      _found_by_token := TRUE;
      RAISE LOG 'handle_new_user: found valid invitation by token, id=%', _invitation.id;
    ELSE
      RAISE LOG 'handle_new_user: token provided but no matching invitation found';
    END IF;
  END IF;
  
  -- Fallback: find by email
  IF _invitation.id IS NULL THEN
    SELECT * INTO _invitation 
    FROM public.invitations 
    WHERE LOWER(email) = LOWER(NEW.email) AND status = 'pending' AND expires_at > now()
    ORDER BY created_at DESC LIMIT 1;
    
    IF _invitation.id IS NOT NULL THEN
      RAISE LOG 'handle_new_user: found invitation by email, id=%', _invitation.id;
    END IF;
  END IF;

  IF _invitation.id IS NOT NULL THEN
    _business_id := _invitation.business_id;
    _role := _invitation.role;
    RAISE LOG 'handle_new_user: using invitation role=%, business_id=%', _role, _business_id;
    
    IF _invitation.personnel_id IS NOT NULL THEN
      UPDATE public.personnel SET user_id = NEW.id WHERE id = _invitation.personnel_id;
    END IF;
    
    UPDATE public.invitations SET status = 'accepted' WHERE id = _invitation.id;
  ELSE
    RAISE LOG 'handle_new_user: NO VALID INVITATION FOUND for email=%', NEW.email;
    RAISE EXCEPTION 'Registration requires a valid invitation. Please contact an administrator to request access.';
  END IF;

  INSERT INTO public.profiles (id, email, full_name, business_id)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email), _business_id);

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role);
  RETURN NEW;
END;
$$;
