
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workers can view businesses they belong to" ON public.businesses;
CREATE POLICY "Workers can view businesses they belong to"
ON public.businesses FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.personnel p
    WHERE p.business_id = businesses.id
    AND p.user_id = auth.uid()
    AND p.user_id IS NOT NULL
  )
);

DROP POLICY IF EXISTS "Workers can view documents for their businesses" ON public.business_documents;
CREATE POLICY "Workers can view documents for their businesses"
ON public.business_documents FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.personnel p
    WHERE p.business_id = business_documents.business_id
    AND p.user_id = auth.uid()
    AND p.user_id IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_personnel_user_id ON public.personnel(user_id);
CREATE INDEX IF NOT EXISTS idx_personnel_business_user ON public.personnel(business_id, user_id);
