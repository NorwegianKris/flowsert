
-- 1. Update is_superadmin to include hello@flowsert.com
CREATE OR REPLACE FUNCTION public.is_superadmin(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = _user_id
      AND p.email IN ('kmu@live.no', 'hello@flowsert.com')
  )
$$;

-- 2. Update handle_new_user to bypass invitation for platform admin
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
  _invite_token TEXT;
  _job_seeker_token TEXT;
  _freelancer_invitation RECORD;
  _freelancer_role TEXT;
  _found_by_token BOOLEAN := FALSE;
  _ent RECORD;
  _active_count INTEGER;
  _should_activate BOOLEAN;
BEGIN
  RAISE LOG 'handle_new_user: email=%, metadata=%', NEW.email, NEW.raw_user_meta_data::text;

  -- Platform admin bypass: no invitation required, no business affiliation
  IF lower(NEW.email) = 'hello@flowsert.com' THEN
    INSERT INTO public.profiles (id, email, full_name, business_id)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email), NULL);

    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin'::app_role);
    RAISE LOG 'handle_new_user: platform admin bypass for %', NEW.email;
    RETURN NEW;
  END IF;

  -- Check for freelancer token
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

      PERFORM pg_advisory_xact_lock(hashtext(_business_id::text)::bigint);
      PERFORM set_config('app.allow_activation_change', 'true', true);

      SELECT e.tier, e.is_active, e.profile_cap, e.is_unlimited INTO _ent
        FROM public.get_business_entitlement(_business_id) e;

      IF _ent.is_unlimited THEN
        _should_activate := true;
      ELSE
        SELECT count(*) INTO _active_count
          FROM public.personnel
         WHERE business_id = _business_id AND activated = true;
        _should_activate := (_active_count < _ent.profile_cap);
      END IF;

      INSERT INTO public.personnel (
        name, email, phone, role, location, business_id, user_id, is_freelancer, activated, category
      ) VALUES (
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
        NEW.email, '', _freelancer_role, 'Not specified',
        _business_id, NEW.id, true, _should_activate, 'freelancer'
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
    ELSE
      SELECT id INTO _invitation.personnel_id
      FROM public.personnel
      WHERE business_id = _invitation.business_id
        AND lower(email) = lower(NEW.email)
      LIMIT 1;

      IF _invitation.personnel_id IS NOT NULL THEN
        UPDATE public.personnel SET user_id = NEW.id WHERE id = _invitation.personnel_id;
      END IF;
    END IF;

    UPDATE public.invitations
       SET status = 'accepted',
           personnel_id = _invitation.personnel_id
     WHERE id = _invitation.id;
  ELSE
    RAISE LOG 'handle_new_user: NO VALID INVITATION FOUND for email=%', NEW.email;
    RAISE EXCEPTION 'Registration requires a valid invitation. Please contact an administrator to request access.';
  END IF;

  INSERT INTO public.profiles (id, email, full_name, business_id)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email), _business_id);

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role);
  RETURN NEW;
END;
$function$;
