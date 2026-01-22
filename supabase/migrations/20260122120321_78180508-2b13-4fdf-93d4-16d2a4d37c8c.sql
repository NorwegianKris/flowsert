-- Create project messages table for group chat
CREATE TABLE public.project_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  sender_name TEXT NOT NULL,
  sender_role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.project_messages ENABLE ROW LEVEL SECURITY;

-- Require authentication
CREATE POLICY "Require authentication for project_messages"
ON public.project_messages
AS RESTRICTIVE
FOR ALL
USING (auth.uid() IS NOT NULL);

-- Admins can view messages for their business projects
CREATE POLICY "Admins can view project messages"
ON public.project_messages
FOR SELECT
USING (
  has_role(auth.uid(), 'admin') AND
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = project_messages.project_id
    AND p.business_id = get_user_business_id(auth.uid())
  )
);

-- Admins can send messages to their business projects
CREATE POLICY "Admins can send project messages"
ON public.project_messages
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin') AND
  sender_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = project_messages.project_id
    AND p.business_id = get_user_business_id(auth.uid())
  )
);

-- Workers can view messages for projects they're assigned to or invited to
CREATE POLICY "Workers can view project messages"
ON public.project_messages
FOR SELECT
USING (
  has_role(auth.uid(), 'worker') AND
  can_worker_access_project(auth.uid(), project_id)
);

-- Workers can send messages to projects they're assigned to
CREATE POLICY "Workers can send project messages"
ON public.project_messages
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'worker') AND
  sender_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM personnel per
    JOIN projects p ON per.id::text = ANY(p.assigned_personnel)
    WHERE per.user_id = auth.uid()
    AND p.id = project_messages.project_id
  )
);

-- Enable realtime for project messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_messages;

-- Create index for faster queries
CREATE INDEX idx_project_messages_project_id ON public.project_messages(project_id);
CREATE INDEX idx_project_messages_created_at ON public.project_messages(created_at);