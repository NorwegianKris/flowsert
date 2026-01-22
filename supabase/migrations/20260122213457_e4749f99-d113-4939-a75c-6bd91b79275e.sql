-- Create a function to check if personnel is a job seeker
CREATE OR REPLACE FUNCTION public.is_job_seeker_personnel(_personnel_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT is_job_seeker FROM public.personnel WHERE id = _personnel_id),
    FALSE
  )
$$;

-- Create storage policy to block certificate document access for job seekers
-- First, drop existing policies if they exist and recreate with job seeker check

-- Block SELECT (viewing/downloading) of job seeker certificate documents
CREATE POLICY "Block job seeker certificate document downloads"
ON storage.objects
FOR SELECT
USING (
  bucket_id != 'certificate-documents' 
  OR NOT public.is_job_seeker_personnel((storage.foldername(name))[1]::uuid)
);

-- Block job seeker certificate document access for admins viewing
-- Update: Admins cannot access certificate documents for job seekers
CREATE POLICY "Admins cannot view job seeker certificate documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'certificate-documents' 
  AND NOT public.is_job_seeker_personnel((storage.foldername(name))[1]::uuid)
  AND public.can_access_personnel(auth.uid(), (storage.foldername(name))[1]::uuid)
);