-- Add company_code column with 6-character random alphanumeric code
ALTER TABLE public.businesses 
ADD COLUMN company_code text UNIQUE DEFAULT upper(substring(encode(extensions.gen_random_bytes(4), 'hex') from 1 for 6));

-- Ensure existing rows get unique codes
UPDATE public.businesses 
SET company_code = upper(substring(encode(extensions.gen_random_bytes(4), 'hex') from 1 for 6))
WHERE company_code IS NULL;

-- Make company_code NOT NULL after populating
ALTER TABLE public.businesses 
ALTER COLUMN company_code SET NOT NULL;

-- Create index for fast lookups
CREATE INDEX idx_businesses_company_code ON public.businesses(company_code);

-- Create a public function to get business info and active job seeker invitation by company code
-- This needs to be accessible without authentication for the registration page
CREATE OR REPLACE FUNCTION public.get_job_seeker_registration_by_code(lookup_code text)
RETURNS TABLE(
  business_id uuid,
  business_name text,
  token text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    b.id as business_id,
    b.name as business_name,
    jsi.token
  FROM businesses b
  JOIN job_seeker_invitations jsi ON jsi.business_id = b.id
  WHERE b.company_code = upper(lookup_code)
    AND jsi.is_active = true
  LIMIT 1;
$$;