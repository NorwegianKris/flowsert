CREATE TABLE IF NOT EXISTS public.usage_ledger (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  event_type    text NOT NULL
    CHECK (event_type IN (
      'ocr_extraction',
      'assistant_query',
      'personnel_match',
      'email_sent'
    )),
  quantity      bigint NOT NULL DEFAULT 1,
  model         text,
  billing_month date NOT NULL DEFAULT date_trunc('month', now())::date,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_usage_ledger_business_month
  ON public.usage_ledger (business_id, billing_month);
CREATE INDEX IF NOT EXISTS idx_usage_ledger_business_created
  ON public.usage_ledger (business_id, created_at DESC);

ALTER TABLE public.usage_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_ledger FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS usage_ledger_read_own ON public.usage_ledger;
CREATE POLICY usage_ledger_read_own
  ON public.usage_ledger FOR SELECT TO authenticated
  USING (business_id = public.get_user_business_id(auth.uid()));