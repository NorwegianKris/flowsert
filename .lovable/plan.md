## Plan: Fix notification_recipients cross-tenant RLS vulnerability

### Problem

The `notification_recipients` table has two admin policies (SELECT and INSERT) that only check `auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin')` — no `business_id` scoping. Any admin from any business can view and insert notification recipients for all businesses.

### Migration

Drop and recreate both admin policies with proper business_id scoping via the `personnel` table:

```sql
-- Fix SELECT: admin can only see recipients in their business
DROP POLICY "Admins can view notification recipients" ON public.notification_recipients;
CREATE POLICY "Admins can view notification recipients"
ON public.notification_recipients
FOR SELECT TO public
USING (
  has_role(auth.uid(), 'admin'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.personnel p
    WHERE p.id = notification_recipients.personnel_id
      AND p.business_id = get_user_business_id(auth.uid())
  )
);

-- Fix INSERT: admin can only add recipients in their business
DROP POLICY "Admins can insert notification recipients" ON public.notification_recipients;
CREATE POLICY "Admins can insert notification recipients"
ON public.notification_recipients
FOR INSERT TO public
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.personnel p
    WHERE p.id = notification_recipients.personnel_id
      AND p.business_id = get_user_business_id(auth.uid())
  )
);
```

### No changes to
- Client code (NotificationBell, SendNotificationDialog already filter by personnel_id)
- Worker policies (already properly scoped via `p.user_id = auth.uid()`)
- `notifications` table policies (already has `business_id = get_user_business_id()`)

### Risk
Q1 — RLS/policy change. Anchor required before publish.
