CREATE INDEX IF NOT EXISTS project_messages_project_id_created_at_idx
  ON public.project_messages (project_id, created_at DESC);