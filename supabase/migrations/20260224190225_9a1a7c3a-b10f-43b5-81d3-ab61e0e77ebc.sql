
-- =============================================
-- Billing tables for Stripe webhook integration
-- =============================================

-- 1. billing_customers
CREATE TABLE public.billing_customers (
  business_id UUID NOT NULL PRIMARY KEY REFERENCES public.businesses(id) ON DELETE CASCADE,
  stripe_customer_id TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.billing_customers ENABLE ROW LEVEL SECURITY;

-- Restrictive base: require auth
CREATE POLICY "Authenticated users only"
  ON public.billing_customers AS RESTRICTIVE
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Admin SELECT scoped to business_id
CREATE POLICY "Admins can view own billing customer"
  ON public.billing_customers
  FOR SELECT USING (
    public.has_role(auth.uid(), 'admin') AND
    business_id = public.get_user_business_id(auth.uid())
  );

-- Block all client writes
REVOKE INSERT, UPDATE, DELETE ON public.billing_customers FROM authenticated;

-- 2. billing_subscriptions
CREATE TABLE public.billing_subscriptions (
  business_id UUID NOT NULL PRIMARY KEY REFERENCES public.businesses(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT,
  stripe_price_id TEXT,
  stripe_product_id TEXT,
  status TEXT,
  trial_end TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.billing_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users only"
  ON public.billing_subscriptions AS RESTRICTIVE
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can view own billing subscription"
  ON public.billing_subscriptions
  FOR SELECT USING (
    public.has_role(auth.uid(), 'admin') AND
    business_id = public.get_user_business_id(auth.uid())
  );

REVOKE INSERT, UPDATE, DELETE ON public.billing_subscriptions FROM authenticated;

-- Auto-update updated_at
CREATE TRIGGER update_billing_subscriptions_updated_at
  BEFORE UPDATE ON public.billing_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 3. billing_events
CREATE TABLE public.billing_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stripe_event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  business_id UUID,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  resolution_failed BOOLEAN NOT NULL DEFAULT false,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users only"
  ON public.billing_events AS RESTRICTIVE
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can view own billing events"
  ON public.billing_events
  FOR SELECT USING (
    public.has_role(auth.uid(), 'admin') AND
    business_id = public.get_user_business_id(auth.uid())
  );

REVOKE INSERT, UPDATE, DELETE ON public.billing_events FROM authenticated;

-- Indexes
CREATE INDEX idx_billing_events_business_id ON public.billing_events(business_id);
CREATE INDEX idx_billing_events_stripe_subscription_id ON public.billing_events(stripe_subscription_id);
