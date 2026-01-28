-- Create a security definer function to check if a user can access a notification
CREATE OR REPLACE FUNCTION public.can_access_notification(_user_id uuid, _notification_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN _user_id IS NULL THEN FALSE
    WHEN _notification_id IS NULL THEN FALSE
    -- Admin can access notifications in their business
    WHEN has_role(_user_id, 'admin') THEN
      EXISTS (
        SELECT 1 FROM notifications n
        WHERE n.id = _notification_id
          AND n.business_id = get_user_business_id(_user_id)
      )
    -- Worker can access notifications sent to them
    WHEN has_role(_user_id, 'worker') THEN
      EXISTS (
        SELECT 1 FROM notification_recipients nr
        JOIN personnel p ON p.id = nr.personnel_id
        WHERE nr.notification_id = _notification_id
          AND p.user_id = _user_id
      )
    ELSE FALSE
  END
$$;

-- Create a function to check if user can insert notifications
CREATE OR REPLACE FUNCTION public.can_insert_notification(_user_id uuid, _business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN _user_id IS NULL THEN FALSE
    WHEN _business_id IS NULL THEN FALSE
    ELSE _business_id = get_user_business_id(_user_id) AND has_role(_user_id, 'admin')
  END
$$;

-- Drop existing policies on notifications
DROP POLICY IF EXISTS "Admins can insert notifications for their business" ON public.notifications;
DROP POLICY IF EXISTS "Admins can view notifications for their business" ON public.notifications;
DROP POLICY IF EXISTS "Workers can view notifications sent to them" ON public.notifications;

-- Create simple non-recursive policies for notifications
CREATE POLICY "Users can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (can_insert_notification(auth.uid(), business_id));

CREATE POLICY "Users can view notifications"
  ON public.notifications FOR SELECT
  USING (can_access_notification(auth.uid(), id));

-- Drop existing policies on notification_recipients
DROP POLICY IF EXISTS "Admins can insert notification recipients" ON public.notification_recipients;
DROP POLICY IF EXISTS "Admins can view notification recipients for their business" ON public.notification_recipients;
DROP POLICY IF EXISTS "Workers can view their own notification recipients" ON public.notification_recipients;
DROP POLICY IF EXISTS "Workers can update their own notification recipients" ON public.notification_recipients;

-- Create simple non-recursive policies for notification_recipients
CREATE POLICY "Admins can insert notification recipients"
  ON public.notification_recipients FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can view notification recipients"
  ON public.notification_recipients FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Workers can view their notification recipients"
  ON public.notification_recipients FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND has_role(auth.uid(), 'worker')
    AND EXISTS (
      SELECT 1 FROM personnel p
      WHERE p.id = notification_recipients.personnel_id
        AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Workers can update their notification recipients"
  ON public.notification_recipients FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND has_role(auth.uid(), 'worker')
    AND EXISTS (
      SELECT 1 FROM personnel p
      WHERE p.id = notification_recipients.personnel_id
        AND p.user_id = auth.uid()
    )
  );