
-- Rotation schedule columns
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS rotation_on_days integer,
  ADD COLUMN IF NOT EXISTS rotation_off_days integer,
  ADD COLUMN IF NOT EXISTS rotation_count integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS rotations_completed integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS auto_close_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS next_close_date timestamptz,
  ADD COLUMN IF NOT EXISTS next_open_date timestamptz;

-- Back-to-back shift columns
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS is_shift_parent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS shift_group_id uuid,
  ADD COLUMN IF NOT EXISTS shift_number integer;

-- Project events table for compliance snapshots and auto-close logs
-- NOTE: The auto-close edge function uses the service role key, which bypasses
-- RLS entirely. The INSERT policy below only applies to client-side admin usage.
CREATE TABLE public.project_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_time timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.project_events ENABLE ROW LEVEL SECURITY;

-- SELECT: same-business access via projects join
CREATE POLICY "Users can view project events"
  ON public.project_events
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_events.project_id
    AND p.business_id = public.get_user_business_id(auth.uid())
  ));

-- INSERT: admin only (edge function bypasses RLS via service role key)
CREATE POLICY "Admins can insert project events"
  ON public.project_events
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_events.project_id
      AND p.business_id = public.get_user_business_id(auth.uid())
    )
  );
