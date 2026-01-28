-- Drop the existing insert policy
DROP POLICY IF EXISTS "Users can insert notifications" ON public.notifications;

-- Create a simpler insert policy that doesn't rely on reading the row being inserted
CREATE POLICY "Users can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND has_role(auth.uid(), 'admin')
    AND business_id = get_user_business_id(auth.uid())
  );