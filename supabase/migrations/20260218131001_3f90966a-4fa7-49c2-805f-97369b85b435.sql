-- 1) Enforce ownership presence
ALTER TABLE public.feedback
  ALTER COLUMN user_id SET NOT NULL;

-- 2) Replace INSERT policy
DROP POLICY IF EXISTS "Users can submit feedback for their business" ON public.feedback;
CREATE POLICY "Users can submit feedback for their business"
  ON public.feedback FOR INSERT TO authenticated
  WITH CHECK (
    business_id = get_user_business_id(auth.uid())
    AND user_id = auth.uid()
  );

-- 3) Worker own-feedback SELECT
DROP POLICY IF EXISTS "Workers can view their own feedback" ON public.feedback;
CREATE POLICY "Workers can view their own feedback"
  ON public.feedback FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'worker')
    AND user_id = auth.uid()
    AND business_id = get_user_business_id(auth.uid())
  );

-- 4) Remove broad FOR ALL baseline
DROP POLICY IF EXISTS "Require authentication for feedback" ON public.feedback;