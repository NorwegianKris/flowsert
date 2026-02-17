
-- Step 1: Drop old constraint
ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_visibility_check;

-- Step 2: Drop old columns
ALTER TABLE public.projects
  DROP COLUMN IF EXISTS visibility_all,
  DROP COLUMN IF EXISTS visibility_countries,
  DROP COLUMN IF EXISTS visibility_cities;

-- Step 3: Add new columns
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS project_country text,
  ADD COLUMN IF NOT EXISTS project_location_label text,
  ADD COLUMN IF NOT EXISTS visibility_mode text NOT NULL DEFAULT 'same_country',
  ADD COLUMN IF NOT EXISTS include_countries text[],
  ADD COLUMN IF NOT EXISTS exclude_countries text[];

-- Step 3b: Backfill project_country for existing posted projects (use location as placeholder, normalized)
UPDATE public.projects
SET project_country = LOWER(TRIM(location))
WHERE is_posted = true AND project_country IS NULL AND location IS NOT NULL AND TRIM(location) <> '';

-- For any remaining posted projects with no location, unpost them so constraint passes
UPDATE public.projects
SET is_posted = false
WHERE is_posted = true AND (project_country IS NULL OR TRIM(project_country) = '');

-- Step 4: Replace can_worker_see_posted_project function
CREATE OR REPLACE FUNCTION public.can_worker_see_posted_project(_user_id uuid, _project_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  -- Workers with NULL country are treated as "unknown location":
  -- they only see projects when visibility_mode = 'all'.
  SELECT EXISTS (
    SELECT 1
    FROM projects p
    JOIN personnel per ON per.business_id = p.business_id
    WHERE p.id = _project_id
      AND p.is_posted = true
      AND per.user_id = _user_id
      AND NOT (
        LOWER(TRIM(COALESCE(per.country, '')))
        = ANY(
          ARRAY(SELECT LOWER(TRIM(x))
                FROM unnest(COALESCE(p.exclude_countries, ARRAY[]::text[])) x)
        )
      )
      AND (
        CASE COALESCE(p.visibility_mode, 'same_country')
          WHEN 'all' THEN true
          WHEN 'same_country' THEN
            LOWER(TRIM(COALESCE(per.country, '')))
              = LOWER(TRIM(COALESCE(p.project_country, '')))
            OR LOWER(TRIM(COALESCE(per.country, '')))
              = ANY(
                ARRAY(SELECT LOWER(TRIM(x))
                      FROM unnest(COALESCE(p.include_countries, ARRAY[]::text[])) x)
              )
          ELSE false
        END
      )
  );
$$;

-- Step 5: Add CHECK constraints NOT VALID
ALTER TABLE public.projects
  ADD CONSTRAINT projects_posted_country_check
    CHECK (is_posted = false OR project_country IS NOT NULL) NOT VALID;

ALTER TABLE public.projects
  ADD CONSTRAINT projects_visibility_mode_check
    CHECK (visibility_mode IN ('same_country', 'all')) NOT VALID;

-- Step 6: Validate constraints
ALTER TABLE public.projects VALIDATE CONSTRAINT projects_posted_country_check;
ALTER TABLE public.projects VALIDATE CONSTRAINT projects_visibility_mode_check;

-- Step 7: Notify schema cache reload
NOTIFY pgrst, 'reload schema';
