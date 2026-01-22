-- Update all non-job-seeker profiles to be activated
UPDATE public.personnel 
SET activated = true 
WHERE is_job_seeker = false;

-- Update the is_personnel_activated function to return true for non-job-seekers
CREATE OR REPLACE FUNCTION public.is_personnel_activated(_personnel_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT 
      CASE 
        -- Non-job-seekers are always considered activated
        WHEN is_job_seeker = false THEN true
        -- Job seekers need explicit activation
        ELSE activated
      END
    FROM personnel WHERE id = _personnel_id),
    false
  );
$$;

-- Update can_assign_personnel_to_project to match
CREATE OR REPLACE FUNCTION public.can_assign_personnel_to_project(_personnel_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_personnel_activated(_personnel_id);
$$;