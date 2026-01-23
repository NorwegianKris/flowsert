-- Add unique profile_code to personnel (similar to business company_code)
ALTER TABLE public.personnel 
ADD COLUMN profile_code text NOT NULL DEFAULT upper(SUBSTRING(encode(extensions.gen_random_bytes(4), 'hex') FROM 1 FOR 6));

-- Create unique index for profile_code
CREATE UNIQUE INDEX personnel_profile_code_unique ON public.personnel(profile_code);

-- Add comment for documentation
COMMENT ON COLUMN public.personnel.profile_code IS 'Unique 6-character alphanumeric registration code for each personnel profile';