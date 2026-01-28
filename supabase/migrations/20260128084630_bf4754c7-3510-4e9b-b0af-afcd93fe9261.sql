-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view notifications" ON public.notifications;

-- Create separate SELECT policies for admin and worker
CREATE POLICY "Admins can view notifications"
  ON public.notifications FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND has_role(auth.uid(), 'admin')
    AND business_id = get_user_business_id(auth.uid())
  );

CREATE POLICY "Workers can view their notifications"
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