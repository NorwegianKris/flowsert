-- Create direct_messages table for business-worker communication
CREATE TABLE public.direct_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  personnel_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  sender_role text NOT NULL CHECK (sender_role IN ('admin', 'worker')),
  content text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

-- Require authentication
CREATE POLICY "Require authentication for direct_messages"
ON public.direct_messages FOR ALL
USING (auth.uid() IS NOT NULL);

-- Admins can view messages for personnel in their business
CREATE POLICY "Admins can view messages for their business personnel"
ON public.direct_messages FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) AND 
  EXISTS (
    SELECT 1 FROM personnel p 
    WHERE p.id = direct_messages.personnel_id 
    AND p.business_id = get_user_business_id(auth.uid())
  )
);

-- Admins can send messages to personnel in their business
CREATE POLICY "Admins can send messages to their business personnel"
ON public.direct_messages FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) AND 
  sender_id = auth.uid() AND
  sender_role = 'admin' AND
  EXISTS (
    SELECT 1 FROM personnel p 
    WHERE p.id = direct_messages.personnel_id 
    AND p.business_id = get_user_business_id(auth.uid())
  )
);

-- Workers can view their own messages
CREATE POLICY "Workers can view their own messages"
ON public.direct_messages FOR SELECT
USING (
  has_role(auth.uid(), 'worker'::app_role) AND 
  EXISTS (
    SELECT 1 FROM personnel p 
    WHERE p.id = direct_messages.personnel_id 
    AND p.user_id = auth.uid()
  )
);

-- Workers can send messages for their own personnel record
CREATE POLICY "Workers can send their own messages"
ON public.direct_messages FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'worker'::app_role) AND 
  sender_id = auth.uid() AND
  sender_role = 'worker' AND
  EXISTS (
    SELECT 1 FROM personnel p 
    WHERE p.id = direct_messages.personnel_id 
    AND p.user_id = auth.uid()
  )
);

-- Admins can update messages (mark as read)
CREATE POLICY "Admins can update messages for their business"
ON public.direct_messages FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) AND 
  EXISTS (
    SELECT 1 FROM personnel p 
    WHERE p.id = direct_messages.personnel_id 
    AND p.business_id = get_user_business_id(auth.uid())
  )
);

-- Workers can update their own messages (mark as read)
CREATE POLICY "Workers can update their own messages"
ON public.direct_messages FOR UPDATE
USING (
  has_role(auth.uid(), 'worker'::app_role) AND 
  EXISTS (
    SELECT 1 FROM personnel p 
    WHERE p.id = direct_messages.personnel_id 
    AND p.user_id = auth.uid()
  )
);

-- Create index for faster queries
CREATE INDEX idx_direct_messages_personnel_id ON public.direct_messages(personnel_id);
CREATE INDEX idx_direct_messages_created_at ON public.direct_messages(created_at DESC);

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;