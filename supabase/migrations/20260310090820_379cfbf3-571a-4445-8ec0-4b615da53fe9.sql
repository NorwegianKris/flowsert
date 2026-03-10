
-- Explicitly deny UPDATE and DELETE on project_events (events are immutable audit records)
CREATE POLICY "No updates on project events"
  ON public.project_events
  FOR UPDATE TO authenticated
  USING (false);

CREATE POLICY "No deletes on project events"
  ON public.project_events
  FOR DELETE TO authenticated
  USING (false);
