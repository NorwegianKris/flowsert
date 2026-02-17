
-- 1. Add structured location fields to personnel
ALTER TABLE personnel ADD COLUMN country text;
ALTER TABLE personnel ADD COLUMN city text;

-- 2. Backfill with normalized values
UPDATE personnel
SET city = NULLIF(LOWER(TRIM(split_part(location, ',', 1))), ''),
    country = NULLIF(LOWER(TRIM(split_part(location, ',', 2))), '')
WHERE location IS NOT NULL
  AND location NOT IN ('Not specified', 'Not Specified', '')
  AND position(',' IN location) > 0;

-- 3. Add visibility fields to projects
ALTER TABLE projects
  ADD COLUMN visibility_all boolean NOT NULL DEFAULT true,
  ADD COLUMN visibility_countries text[],
  ADD COLUMN visibility_cities jsonb;

-- 4. Add CHECK constraint safely (NOT VALID then VALIDATE)
ALTER TABLE projects
ADD CONSTRAINT projects_visibility_check
CHECK (
  visibility_all = true
  OR (visibility_countries IS NOT NULL AND array_length(visibility_countries, 1) > 0)
) NOT VALID;

ALTER TABLE projects VALIDATE CONSTRAINT projects_visibility_check;

-- 5. Create project_applications table
CREATE TABLE project_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES businesses(id),
  personnel_id uuid NOT NULL REFERENCES personnel(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  initial_message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  rejected_at timestamptz,
  UNIQUE(project_id, personnel_id)
);

ALTER TABLE project_applications ENABLE ROW LEVEL SECURITY;

-- 6. updated_at trigger on project_applications
CREATE TRIGGER update_project_applications_updated_at
  BEFORE UPDATE ON project_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 7. RLS policies for project_applications

-- Base auth gate
CREATE POLICY "Require authentication for project_applications"
  ON project_applications FOR ALL
  USING (auth.uid() IS NOT NULL);

-- Workers can view their own applications
CREATE POLICY "Workers can view their own applications"
  ON project_applications FOR SELECT
  USING (
    has_role(auth.uid(), 'worker'::app_role)
    AND EXISTS (
      SELECT 1 FROM personnel p
      WHERE p.id = project_applications.personnel_id
        AND p.user_id = auth.uid()
    )
  );

-- Workers can insert their own applications
CREATE POLICY "Workers can insert their own applications"
  ON project_applications FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'worker'::app_role)
    AND EXISTS (
      SELECT 1 FROM personnel p
      WHERE p.id = project_applications.personnel_id
        AND p.user_id = auth.uid()
        AND p.business_id = project_applications.business_id
    )
  );

-- Admins can view applications for their business
CREATE POLICY "Admins can view business applications"
  ON project_applications FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    AND business_id = get_user_business_id(auth.uid())
  );

-- Admins can update applications for their business (accept/reject)
CREATE POLICY "Admins can update business applications"
  ON project_applications FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    AND business_id = get_user_business_id(auth.uid())
  );

-- 8. Security definer function for posted project visibility
CREATE OR REPLACE FUNCTION can_worker_see_posted_project(
  _user_id uuid,
  _project_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM projects p
    JOIN personnel per ON per.business_id = p.business_id
    WHERE p.id = _project_id
      AND p.is_posted = true
      AND per.user_id = _user_id
      AND (
        p.visibility_all = true
        OR (
          LOWER(TRIM(COALESCE(per.country, '')))
            = ANY(ARRAY(
              SELECT LOWER(TRIM(x)) FROM unnest(p.visibility_countries) x
            ))
          AND (
            NOT (
              p.visibility_cities ? LOWER(TRIM(COALESCE(per.country, '')))
            )
            OR p.visibility_cities
                -> LOWER(TRIM(COALESCE(per.country, '')))
               = '[]'::jsonb
            OR (
              NULLIF(TRIM(per.city), '') IS NOT NULL
              AND LOWER(TRIM(per.city)) IN (
                SELECT LOWER(TRIM(value))
                FROM jsonb_array_elements_text(
                  p.visibility_cities
                    -> LOWER(TRIM(COALESCE(per.country, '')))
                ) AS value
              )
            )
          )
        )
      )
  );
$$;
