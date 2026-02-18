CREATE TABLE IF NOT EXISTS public.error_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid,
  actor_user_id uuid,
  source text NOT NULL,
  event_type text NOT NULL,
  severity text NOT NULL DEFAULT 'error',
  message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Constraints
ALTER TABLE public.error_events
  ADD CONSTRAINT error_events_event_type_not_empty
  CHECK (length(trim(event_type)) > 0);

ALTER TABLE public.error_events
  ADD CONSTRAINT error_events_severity_check
  CHECK (severity IN ('info', 'warn', 'error'));

ALTER TABLE public.error_events
  ADD CONSTRAINT error_events_source_check
  CHECK (source IN ('edge', 'client', 'db'));

-- Indexes
CREATE INDEX IF NOT EXISTS error_events_business_id_created_at_idx
  ON public.error_events (business_id, created_at DESC);

CREATE INDEX IF NOT EXISTS error_events_created_at_idx
  ON public.error_events (created_at DESC);

-- RLS: SELECT-only
ALTER TABLE public.error_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read error events for their business"
  ON public.error_events FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    AND business_id = get_user_business_id(auth.uid())
  );

CREATE POLICY "Superadmins can read all error events"
  ON public.error_events FOR SELECT TO authenticated
  USING (is_superadmin(auth.uid()));