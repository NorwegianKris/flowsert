

## Harden Feedback Table RLS

### Migration

A single database migration applying all four changes:

1. **`ALTER COLUMN user_id SET NOT NULL`** -- enforces ownership presence (preflight confirmed 0 null rows)
2. **Replace INSERT policy** -- adds `user_id = auth.uid()` check to prevent spoofing
3. **Add worker SELECT policy** -- lets workers view their own feedback, scoped to their business
4. **Drop `Require authentication for feedback`** -- removes the broad `FOR ALL` policy that leaked UPDATE/DELETE access

### Technical Details

```sql
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
```

### What Stays Unchanged

- Admin SELECT policy (business-scoped) -- FeedbackList.tsx keeps working
- Admin DELETE policy (business-scoped)
- No frontend code changes needed (ReportFeedbackDialog already sets `user_id: user?.id`)

### Risk

Zero. Preflight confirmed no null `user_id` rows. All existing admin functionality preserved.

