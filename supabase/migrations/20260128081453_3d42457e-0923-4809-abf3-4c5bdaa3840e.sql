-- Notifications table (stores the actual notification content)
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Notification recipients table (tracks who received what)
CREATE TABLE public.notification_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  personnel_id UUID NOT NULL REFERENCES public.personnel(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(notification_id, personnel_id)
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_recipients ENABLE ROW LEVEL SECURITY;

-- RLS for notifications table
CREATE POLICY "Require authentication for notifications"
  ON public.notifications FOR ALL
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can insert notifications for their business"
  ON public.notifications FOR INSERT
  WITH CHECK (
    business_id = get_user_business_id(auth.uid()) 
    AND has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can view notifications for their business"
  ON public.notifications FOR SELECT
  USING (
    business_id = get_user_business_id(auth.uid()) 
    AND has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Workers can view notifications sent to them"
  ON public.notifications FOR SELECT
  USING (
    has_role(auth.uid(), 'worker') 
    AND EXISTS (
      SELECT 1 FROM notification_recipients nr
      JOIN personnel p ON p.id = nr.personnel_id
      WHERE nr.notification_id = notifications.id
      AND p.user_id = auth.uid()
    )
  );

-- RLS for notification_recipients table
CREATE POLICY "Require authentication for notification_recipients"
  ON public.notification_recipients FOR ALL
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can insert notification recipients"
  ON public.notification_recipients FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin')
    AND EXISTS (
      SELECT 1 FROM notifications n
      WHERE n.id = notification_id
      AND n.business_id = get_user_business_id(auth.uid())
    )
  );

CREATE POLICY "Admins can view notification recipients for their business"
  ON public.notification_recipients FOR SELECT
  USING (
    has_role(auth.uid(), 'admin')
    AND EXISTS (
      SELECT 1 FROM notifications n
      WHERE n.id = notification_id
      AND n.business_id = get_user_business_id(auth.uid())
    )
  );

CREATE POLICY "Workers can view their own notification recipients"
  ON public.notification_recipients FOR SELECT
  USING (
    has_role(auth.uid(), 'worker')
    AND EXISTS (
      SELECT 1 FROM personnel p
      WHERE p.id = personnel_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Workers can update their own notification recipients"
  ON public.notification_recipients FOR UPDATE
  USING (
    has_role(auth.uid(), 'worker')
    AND EXISTS (
      SELECT 1 FROM personnel p
      WHERE p.id = personnel_id
      AND p.user_id = auth.uid()
    )
  );