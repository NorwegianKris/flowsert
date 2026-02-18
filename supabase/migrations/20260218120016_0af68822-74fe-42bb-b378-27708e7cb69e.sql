
-- ============================================================
-- Phase 1.1: project_messages access model documentation
-- ============================================================
-- ACCESS MODEL:
--   SELECT (admin):  business_id match via projects table
--   SELECT (worker): can_worker_access_project() — includes invited AND assigned
--   INSERT (admin):  business_id match via projects table + sender_id = auth.uid()
--   INSERT (worker): assigned_personnel only + sender_id = auth.uid()
--                    (invited-but-not-assigned workers CANNOT send)
--   UPDATE/DELETE:   not allowed (messages are immutable)
-- ============================================================

-- Rename worker INSERT policy for clarity
DROP POLICY IF EXISTS "Workers can send project messages" ON project_messages;

CREATE POLICY "Assigned workers can send project messages"
ON project_messages FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'worker'::app_role)
  AND sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM personnel per
    JOIN projects p ON per.id::text = ANY(p.assigned_personnel)
    WHERE per.user_id = auth.uid()
    AND p.id = project_messages.project_id
  )
);
