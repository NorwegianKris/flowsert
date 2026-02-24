
-- ============================================================
-- Hardened Atomic Activation Toggle + Entitlement Cap Enforcement
-- Risk: RED
-- ============================================================

-- A. Create entitlements table
CREATE TABLE public.entitlements (
  business_id UUID PRIMARY KEY REFERENCES public.businesses(id) ON DELETE CASCADE,
  tier TEXT NOT NULL DEFAULT 'starter',
  is_active BOOLEAN NOT NULL DEFAULT false,
  profile_cap INTEGER NOT NULL DEFAULT 25,
  is_unlimited BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.entitlements ENABLE ROW LEVEL SECURITY;

-- SELECT policy: admins of same business only
CREATE POLICY "Admins can view their business entitlement"
  ON public.entitlements
  FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    AND business_id = get_user_business_id(auth.uid())
  );

-- No INSERT/UPDATE/DELETE policies for end users

-- Defense-in-depth: revoke write privileges from authenticated role
REVOKE INSERT, UPDATE, DELETE ON public.entitlements FROM authenticated;

-- B. get_business_entitlement
CREATE OR REPLACE FUNCTION public.get_business_entitlement(p_business_id UUID)
RETURNS TABLE(tier TEXT, is_active BOOLEAN, profile_cap INTEGER, is_unlimited BOOLEAN)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_rec RECORD;
BEGIN
  SELECT e.tier, e.is_active, e.profile_cap, e.is_unlimited
    INTO v_rec
    FROM public.entitlements e
   WHERE e.business_id = p_business_id;

  IF FOUND THEN
    tier := v_rec.tier;
    is_active := v_rec.is_active;
    profile_cap := v_rec.profile_cap;
    is_unlimited := v_rec.is_unlimited;
  ELSE
    tier := 'starter';
    is_active := false;
    profile_cap := 25;
    is_unlimited := false;
  END IF;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.get_business_entitlement(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_business_entitlement(UUID) TO authenticated;

-- C. activate_personnel RPC
CREATE OR REPLACE FUNCTION public.activate_personnel(
  p_personnel_id UUID,
  p_category TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_caller_business UUID;
  v_personnel RECORD;
  v_ent RECORD;
  v_active_count INTEGER;
BEGIN
  -- Auth: caller must be admin
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = 'P0001';
  END IF;

  v_caller_business := get_user_business_id(auth.uid());

  -- Fetch personnel
  SELECT id, business_id, activated INTO v_personnel
    FROM public.personnel
   WHERE id = p_personnel_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PERSONNEL_NOT_FOUND' USING ERRCODE = 'P0001';
  END IF;

  -- Business match
  IF v_personnel.business_id IS DISTINCT FROM v_caller_business THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = 'P0001';
  END IF;

  -- Already active: return early
  IF v_personnel.activated THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_active', true
    );
  END IF;

  -- Concurrency lock per business
  PERFORM pg_advisory_xact_lock(hashtext(v_caller_business::text)::bigint);

  -- Get entitlement
  SELECT e.tier, e.is_active, e.profile_cap, e.is_unlimited INTO v_ent
    FROM public.get_business_entitlement(v_caller_business) e;

  -- Cap check
  IF NOT v_ent.is_unlimited THEN
    SELECT count(*) INTO v_active_count
      FROM public.personnel
     WHERE business_id = v_caller_business AND activated = true;

    IF v_active_count >= v_ent.profile_cap THEN
      RAISE EXCEPTION 'PROFILE_CAP_REACHED' USING ERRCODE = 'P0001';
    END IF;
  ELSE
    SELECT count(*) INTO v_active_count
      FROM public.personnel
     WHERE business_id = v_caller_business AND activated = true;
  END IF;

  -- Set session flag so trigger allows the change
  PERFORM set_config('app.allow_activation_change', 'true', true);

  -- Update
  IF p_category IS NOT NULL THEN
    UPDATE public.personnel SET activated = true, category = p_category WHERE id = p_personnel_id;
  ELSE
    UPDATE public.personnel SET activated = true WHERE id = p_personnel_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'active_count', v_active_count + 1,
    'profile_cap', v_ent.profile_cap,
    'tier', v_ent.tier,
    'is_unlimited', v_ent.is_unlimited
  );
END;
$$;

REVOKE ALL ON FUNCTION public.activate_personnel(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.activate_personnel(UUID, TEXT) TO authenticated;

-- D. deactivate_personnel RPC
CREATE OR REPLACE FUNCTION public.deactivate_personnel(p_personnel_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_caller_business UUID;
  v_personnel RECORD;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = 'P0001';
  END IF;

  v_caller_business := get_user_business_id(auth.uid());

  SELECT id, business_id, activated INTO v_personnel
    FROM public.personnel
   WHERE id = p_personnel_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PERSONNEL_NOT_FOUND' USING ERRCODE = 'P0001';
  END IF;

  IF v_personnel.business_id IS DISTINCT FROM v_caller_business THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = 'P0001';
  END IF;

  IF NOT v_personnel.activated THEN
    RETURN jsonb_build_object('success', true, 'already_inactive', true);
  END IF;

  PERFORM set_config('app.allow_activation_change', 'true', true);

  UPDATE public.personnel SET activated = false WHERE id = p_personnel_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.deactivate_personnel(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.deactivate_personnel(UUID) TO authenticated;

-- E. Trigger to block direct activation changes
CREATE OR REPLACE FUNCTION public.prevent_direct_activation_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.activated IS DISTINCT FROM NEW.activated THEN
      IF current_setting('app.allow_activation_change', true) IS DISTINCT FROM 'true' THEN
        RAISE EXCEPTION 'ACTIVATION_VIA_RPC_ONLY' USING ERRCODE = 'P0001';
      END IF;
    END IF;
  ELSIF TG_OP = 'INSERT' THEN
    IF NEW.activated = true THEN
      IF current_setting('app.allow_activation_change', true) IS DISTINCT FROM 'true' THEN
        RAISE EXCEPTION 'ACTIVATION_VIA_RPC_ONLY' USING ERRCODE = 'P0001';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_prevent_direct_activation_change
  BEFORE INSERT OR UPDATE ON public.personnel
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_direct_activation_change();

-- F. Update handle_new_user: freelancer branch with advisory lock + cap check
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
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

      -- Advisory lock: serialize against admin activations and other registrations
      PERFORM pg_advisory_xact_lock(hashtext(_business_id::text)::bigint);

      -- Set session flag so trigger allows the insert
      PERFORM set_config('app.allow_activation_change', 'true', true);

      -- Fetch entitlement and count
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

-- G. Seed existing businesses with default starter entitlement
INSERT INTO public.entitlements (business_id, tier, is_active, profile_cap, is_unlimited)
SELECT id, 'starter', false, 25, false
FROM public.businesses
WHERE id NOT IN (SELECT business_id FROM public.entitlements)
ON CONFLICT DO NOTHING;
