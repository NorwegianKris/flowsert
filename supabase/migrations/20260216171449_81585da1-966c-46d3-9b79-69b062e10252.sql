
-- Update is_personnel_activated to respect the activated column for ALL personnel types
CREATE OR REPLACE FUNCTION public.is_personnel_activated(_personnel_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (SELECT activated FROM personnel WHERE id = _personnel_id),
    false
  );
$function$;

-- Set all existing non-freelancer personnel to activated = true (they were previously treated as always active)
UPDATE public.personnel SET activated = true WHERE is_freelancer = false AND activated = false;
