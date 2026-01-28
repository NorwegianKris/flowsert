-- Fix infinite recursion: remove the ALL policy and keep specific policies

-- Drop conflicting policies
DROP POLICY IF EXISTS "Require authentication for notifications" ON public.notifications;

-- Recreate auth check on specific operations
DROP POLICY IF EXISTS "Admins can insert notifications for their business" ON public.notifications;
DROP POLICY IF EXISTS "Admins can view notifications for their business" ON public.notifications;
DROP POLICY IF EXISTS "Workers can view notifications sent to them" ON public.notifications;

-- Recreate policies without recursion
CREATE POLICY "Admins can insert notifications for their business"
  ON public.notifications FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND business_id = get_user_business_id(auth.uid()) 
    AND has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can view notifications for their business"
  ON public.notifications FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND business_id = get_user_business_id(auth.uid()) 
    AND has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Workers can view notifications sent to them"
  ON public.notifications FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND has_role(auth.uid(), 'worker') 
    AND EXISTS (
      SELECT 1 FROM notification_recipients nr
      JOIN personnel p ON p.id = nr.personnel_id
      WHERE nr.notification_id = notifications.id
      AND p.user_id = auth.uid()
    )
  );

-- Fix notification_recipients too
DROP POLICY IF EXISTS "Require authentication for notification_recipients" ON public.notification_recipients;
DROP POLICY IF EXISTS "Admins can insert notification recipients" ON public.notification_recipients;
DROP POLICY IF EXISTS "Admins can view notification recipients for their business" ON public.notification_recipients;
DROP POLICY IF EXISTS "Workers can view their own notification recipients" ON public.notification_recipients;
DROP POLICY IF EXISTS "Workers can update their own notification recipients" ON public.notification_recipients;

CREATE POLICY "Admins can insert notification recipients"
  ON public.notification_recipients FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND has_role(auth.uid(), 'admin')
    AND EXISTS (
      SELECT 1 FROM notifications n
      WHERE n.id = notification_id
      AND n.business_id = get_user_business_id(auth.uid())
    )
  );

CREATE POLICY "Admins can view notification recipients for their business"
  ON public.notification_recipients FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND has_role(auth.uid(), 'admin')
    AND EXISTS (
      SELECT 1 FROM notifications n
      WHERE n.id = notification_id
      AND n.business_id = get_user_business_id(auth.uid())
    )
  );

CREATE POLICY "Workers can view their own notification recipients"
  ON public.notification_recipients FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND has_role(auth.uid(), 'worker')
    AND EXISTS (
      SELECT 1 FROM personnel p
      WHERE p.id = personnel_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Workers can update their own notification recipients"
  ON public.notification_recipients FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND has_role(auth.uid(), 'worker')
    AND EXISTS (
      SELECT 1 FROM personnel p
      WHERE p.id = personnel_id
      AND p.user_id = auth.uid()
    )
  );