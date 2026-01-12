-- Fix profiles table email exposure by restricting visibility
-- Workers should only see their own profile, admins/managers can see all in their business

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view profiles in their business" ON public.profiles;

-- Create policy for users to view their own profile
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND id = auth.uid()
);

-- Create policy for admins/managers to view all profiles in their business
CREATE POLICY "Admins can view all profiles in their business" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND business_id = get_user_business_id(auth.uid()) 
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
);

-- Also update the insert policy to be more restrictive
DROP POLICY IF EXISTS "Allow insert during signup" ON public.profiles;

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND id = auth.uid()
);

-- Update the update policy with explicit auth check
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (
  auth.uid() IS NOT NULL 
  AND id = auth.uid()
);