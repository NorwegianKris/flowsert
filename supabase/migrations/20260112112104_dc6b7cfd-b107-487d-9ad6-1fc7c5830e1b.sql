-- Add explicit NULL checks to helper functions for defense-in-depth
-- This ensures unauthenticated users (NULL user_id) are always rejected

-- Update get_user_business_id to explicitly return NULL for NULL input
CREATE OR REPLACE FUNCTION public.get_user_business_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE 
    WHEN _user_id IS NULL THEN NULL
    ELSE (SELECT business_id FROM public.profiles WHERE id = _user_id)
  END
$$;

-- Update has_role to explicitly return FALSE for NULL input
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN _user_id IS NULL THEN FALSE
    ELSE EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = _user_id
        AND role = _role
    )
  END
$$;

-- Update get_user_role to explicitly return NULL for NULL input
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN _user_id IS NULL THEN NULL
    ELSE (SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1)
  END
$$;

-- Update can_access_personnel to explicitly return FALSE for NULL user
CREATE OR REPLACE FUNCTION public.can_access_personnel(_user_id uuid, _personnel_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE
    -- Reject NULL user_id immediately
    WHEN _user_id IS NULL THEN FALSE
    -- Reject NULL personnel_id immediately
    WHEN _personnel_id IS NULL THEN FALSE
    -- Admin or manager can access personnel in their business
    WHEN public.has_role(_user_id, 'admin') OR public.has_role(_user_id, 'manager') THEN
      EXISTS (
        SELECT 1 FROM public.personnel p
        WHERE p.id = _personnel_id
          AND p.business_id = public.get_user_business_id(_user_id)
      )
    -- Worker can only access their own personnel record
    WHEN public.has_role(_user_id, 'worker') THEN
      EXISTS (
        SELECT 1 FROM public.personnel p
        WHERE p.id = _personnel_id
          AND p.user_id = _user_id
      )
    -- Deny all other cases
    ELSE FALSE
  END
$$;

-- Now recreate personnel RLS policies with explicit auth.uid() IS NOT NULL checks
-- Drop existing policies first
DROP POLICY IF EXISTS "Admins can view all personnel in their business" ON public.personnel;
DROP POLICY IF EXISTS "Workers can view their own personnel record" ON public.personnel;
DROP POLICY IF EXISTS "Admins can insert personnel in their business" ON public.personnel;
DROP POLICY IF EXISTS "Admins can update personnel in their business" ON public.personnel;
DROP POLICY IF EXISTS "Workers can update their own personnel record" ON public.personnel;
DROP POLICY IF EXISTS "Admins can delete personnel in their business" ON public.personnel;

-- Recreate policies with explicit authentication check
CREATE POLICY "Admins can view all personnel in their business" 
ON public.personnel 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND business_id = get_user_business_id(auth.uid()) 
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
);

CREATE POLICY "Workers can view their own personnel record" 
ON public.personnel 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND has_role(auth.uid(), 'worker') 
  AND user_id = auth.uid()
);

CREATE POLICY "Admins can insert personnel in their business" 
ON public.personnel 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND business_id = get_user_business_id(auth.uid()) 
  AND has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can update personnel in their business" 
ON public.personnel 
FOR UPDATE 
USING (
  auth.uid() IS NOT NULL 
  AND business_id = get_user_business_id(auth.uid()) 
  AND has_role(auth.uid(), 'admin')
);

CREATE POLICY "Workers can update their own personnel record" 
ON public.personnel 
FOR UPDATE 
USING (
  auth.uid() IS NOT NULL 
  AND has_role(auth.uid(), 'worker') 
  AND user_id = auth.uid()
);

CREATE POLICY "Admins can delete personnel in their business" 
ON public.personnel 
FOR DELETE 
USING (
  auth.uid() IS NOT NULL 
  AND business_id = get_user_business_id(auth.uid()) 
  AND has_role(auth.uid(), 'admin')
);