-- =====================================================
-- MULTI-TENANT ROLE-BASED ACCESS CONTROL MIGRATION
-- =====================================================

-- 1. Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'worker', 'manager');

-- 2. Create businesses table (tenants)
CREATE TABLE public.businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

-- 3. Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 5. Add business_id and user_id to personnel table
ALTER TABLE public.personnel 
  ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 6. Create certificates table (moving from mock data)
CREATE TABLE public.certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  personnel_id UUID REFERENCES public.personnel(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  date_of_issue DATE NOT NULL,
  expiry_date DATE,
  place_of_issue TEXT NOT NULL,
  document_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

-- 7. Create invitations table for worker invites
CREATE TABLE public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  personnel_id UUID REFERENCES public.personnel(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- SECURITY DEFINER FUNCTIONS (bypass RLS safely)
-- =====================================================

-- Function to get user's business_id
CREATE OR REPLACE FUNCTION public.get_user_business_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT business_id FROM public.profiles WHERE id = _user_id
$$;

-- Function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to get user's role (primary role)
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- Function to check if user can access personnel record
-- Admin: can access all personnel in their business
-- Worker: can only access their own linked personnel record
CREATE OR REPLACE FUNCTION public.can_access_personnel(_user_id UUID, _personnel_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN public.has_role(_user_id, 'admin') OR public.has_role(_user_id, 'manager') THEN
      EXISTS (
        SELECT 1 FROM public.personnel p
        WHERE p.id = _personnel_id
          AND p.business_id = public.get_user_business_id(_user_id)
      )
    WHEN public.has_role(_user_id, 'worker') THEN
      EXISTS (
        SELECT 1 FROM public.personnel p
        WHERE p.id = _personnel_id
          AND p.user_id = _user_id
      )
    ELSE FALSE
  END
$$;

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Drop old permissive policies on personnel
DROP POLICY IF EXISTS "Allow public insert to personnel" ON public.personnel;
DROP POLICY IF EXISTS "Allow public read access to personnel" ON public.personnel;
DROP POLICY IF EXISTS "Allow public update to personnel" ON public.personnel;

-- Drop old permissive policies on availability
DROP POLICY IF EXISTS "Allow public delete to availability" ON public.availability;
DROP POLICY IF EXISTS "Allow public insert to availability" ON public.availability;
DROP POLICY IF EXISTS "Allow public read access to availability" ON public.availability;
DROP POLICY IF EXISTS "Allow public update to availability" ON public.availability;

-- BUSINESSES policies
CREATE POLICY "Users can view their own business"
  ON public.businesses FOR SELECT
  TO authenticated
  USING (id = public.get_user_business_id(auth.uid()));

CREATE POLICY "Admins can update their business"
  ON public.businesses FOR UPDATE
  TO authenticated
  USING (id = public.get_user_business_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

-- PROFILES policies
CREATE POLICY "Users can view profiles in their business"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (business_id = public.get_user_business_id(auth.uid()));

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Allow insert during signup"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- USER_ROLES policies
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view roles in their business"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') 
    AND EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = user_id 
        AND p.business_id = public.get_user_business_id(auth.uid())
    )
  );

CREATE POLICY "Admins can insert roles for their business"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    AND EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = user_id 
        AND p.business_id = public.get_user_business_id(auth.uid())
    )
  );

-- PERSONNEL policies
CREATE POLICY "Admins can view all personnel in their business"
  ON public.personnel FOR SELECT
  TO authenticated
  USING (
    business_id = public.get_user_business_id(auth.uid())
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
  );

CREATE POLICY "Workers can view their own personnel record"
  ON public.personnel FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'worker')
    AND user_id = auth.uid()
  );

CREATE POLICY "Admins can insert personnel in their business"
  ON public.personnel FOR INSERT
  TO authenticated
  WITH CHECK (
    business_id = public.get_user_business_id(auth.uid())
    AND public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can update personnel in their business"
  ON public.personnel FOR UPDATE
  TO authenticated
  USING (
    business_id = public.get_user_business_id(auth.uid())
    AND public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can delete personnel in their business"
  ON public.personnel FOR DELETE
  TO authenticated
  USING (
    business_id = public.get_user_business_id(auth.uid())
    AND public.has_role(auth.uid(), 'admin')
  );

-- CERTIFICATES policies
CREATE POLICY "Users can view certificates they have access to"
  ON public.certificates FOR SELECT
  TO authenticated
  USING (public.can_access_personnel(auth.uid(), personnel_id));

CREATE POLICY "Admins can insert certificates"
  ON public.certificates FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    AND public.can_access_personnel(auth.uid(), personnel_id)
  );

CREATE POLICY "Admins can update certificates"
  ON public.certificates FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    AND public.can_access_personnel(auth.uid(), personnel_id)
  );

CREATE POLICY "Admins can delete certificates"
  ON public.certificates FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    AND public.can_access_personnel(auth.uid(), personnel_id)
  );

-- AVAILABILITY policies
CREATE POLICY "Users can view availability they have access to"
  ON public.availability FOR SELECT
  TO authenticated
  USING (public.can_access_personnel(auth.uid(), personnel_id));

CREATE POLICY "Users can insert their own availability"
  ON public.availability FOR INSERT
  TO authenticated
  WITH CHECK (public.can_access_personnel(auth.uid(), personnel_id));

CREATE POLICY "Users can update their own availability"
  ON public.availability FOR UPDATE
  TO authenticated
  USING (public.can_access_personnel(auth.uid(), personnel_id));

CREATE POLICY "Users can delete their own availability"
  ON public.availability FOR DELETE
  TO authenticated
  USING (public.can_access_personnel(auth.uid(), personnel_id));

-- INVITATIONS policies
CREATE POLICY "Admins can view invitations for their business"
  ON public.invitations FOR SELECT
  TO authenticated
  USING (
    business_id = public.get_user_business_id(auth.uid())
    AND public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can create invitations for their business"
  ON public.invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    business_id = public.get_user_business_id(auth.uid())
    AND public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can update invitations for their business"
  ON public.invitations FOR UPDATE
  TO authenticated
  USING (
    business_id = public.get_user_business_id(auth.uid())
    AND public.has_role(auth.uid(), 'admin')
  );

-- Allow anyone to read pending invitation by token (for acceptance)
CREATE POLICY "Anyone can view invitation by token"
  ON public.invitations FOR SELECT
  TO anon, authenticated
  USING (status = 'pending' AND expires_at > now());

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger for businesses updated_at
CREATE TRIGGER update_businesses_updated_at
  BEFORE UPDATE ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for profiles updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for certificates updated_at
CREATE TRIGGER update_certificates_updated_at
  BEFORE UPDATE ON public.certificates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- HELPER FUNCTION: Handle new user signup
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
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
    -- Worker invited by admin
    _business_id := _invitation.business_id;
    _role := 'worker'::app_role;
    
    -- Update invitation status
    UPDATE public.invitations SET status = 'accepted' WHERE id = _invitation.id;
    
    -- Link personnel record
    UPDATE public.personnel SET user_id = NEW.id WHERE id = _invitation.personnel_id;
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

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();