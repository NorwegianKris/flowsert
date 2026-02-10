
-- Create immutable audit table for GDPR data processing acknowledgements
CREATE TABLE public.data_processing_acknowledgements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  personnel_id UUID NOT NULL REFERENCES public.personnel(id),
  business_id UUID NOT NULL REFERENCES public.businesses(id),
  acknowledged_at TIMESTAMPTZ NOT NULL,
  acknowledgement_version TEXT NOT NULL,
  acknowledgement_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.data_processing_acknowledgements ENABLE ROW LEVEL SECURITY;

-- Workers can view their own acknowledgements
CREATE POLICY "Workers can view own acknowledgements"
ON public.data_processing_acknowledgements FOR SELECT
TO authenticated
USING (
  personnel_id IN (
    SELECT id FROM public.personnel WHERE user_id = auth.uid()
  )
);

-- Admins/managers can view business acknowledgements
CREATE POLICY "Admins can view business acknowledgements"
ON public.data_processing_acknowledgements FOR SELECT
TO authenticated
USING (
  business_id = public.get_user_business_id(auth.uid())
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
);

-- Workers can insert their own acknowledgements
CREATE POLICY "Workers can insert own acknowledgements"
ON public.data_processing_acknowledgements FOR INSERT
TO authenticated
WITH CHECK (
  personnel_id IN (
    SELECT id FROM public.personnel WHERE user_id = auth.uid()
  )
);

-- No UPDATE or DELETE policies - records are immutable

-- Index for fast lookups
CREATE INDEX idx_data_processing_ack_personnel ON public.data_processing_acknowledgements(personnel_id);
CREATE INDEX idx_data_processing_ack_business ON public.data_processing_acknowledgements(business_id);
