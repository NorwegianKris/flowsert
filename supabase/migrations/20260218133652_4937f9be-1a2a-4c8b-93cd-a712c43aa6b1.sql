
-- 1) Append-only audit log table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  actor_user_id uuid,
  actor_role text,
  action_type text NOT NULL,
  entity_type text,
  entity_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2) Prevent empty action types
ALTER TABLE public.audit_logs
  ADD CONSTRAINT audit_logs_action_type_not_empty
  CHECK (length(trim(action_type)) > 0);

-- 3) Performance indexes
CREATE INDEX IF NOT EXISTS audit_logs_business_id_created_at_idx
  ON public.audit_logs (business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_actor_user_id_created_at_idx
  ON public.audit_logs (actor_user_id, created_at DESC);

-- 4) Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 5) NO baseline FOR ALL policy (intentional — append-only, service role writes only)

-- 6) Admin reads own business only
CREATE POLICY "Admins can read audit logs for their business"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin')
    AND business_id = get_user_business_id(auth.uid())
  );

-- 7) Superadmin reads all
CREATE POLICY "Superadmins can read all audit logs"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (is_superadmin(auth.uid()));
