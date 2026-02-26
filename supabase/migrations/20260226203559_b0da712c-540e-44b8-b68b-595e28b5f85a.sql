-- Add CHECK constraint on billing_subscriptions.status
-- Valid Stripe subscription statuses
ALTER TABLE public.billing_subscriptions
ADD CONSTRAINT chk_billing_subscription_status
CHECK (
  status IS NULL
  OR status IN (
    'active',
    'canceled',
    'incomplete',
    'incomplete_expired',
    'past_due',
    'trialing',
    'unpaid',
    'paused'
  )
);