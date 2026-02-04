-- Phase 1: Certificate Standardization Schema

-- 1.1 Create certificate_types table (canonical definitions)
CREATE TABLE public.certificate_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.certificate_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, name)
);

-- Enable RLS
ALTER TABLE public.certificate_types ENABLE ROW LEVEL SECURITY;

-- RLS policies for certificate_types
CREATE POLICY "Require authentication for certificate_types"
ON public.certificate_types FOR ALL
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view certificate types for their business"
ON public.certificate_types FOR SELECT
USING (
  business_id = get_user_business_id(auth.uid()) 
  OR business_id IS NULL
);

CREATE POLICY "Admins can insert certificate types"
ON public.certificate_types FOR INSERT
WITH CHECK (
  business_id = get_user_business_id(auth.uid()) 
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
);

CREATE POLICY "Admins can update certificate types"
ON public.certificate_types FOR UPDATE
USING (
  business_id = get_user_business_id(auth.uid()) 
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
);

CREATE POLICY "Admins can delete certificate types"
ON public.certificate_types FOR DELETE
USING (
  business_id = get_user_business_id(auth.uid()) 
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
);

-- 1.2 Create certificate_aliases table (per-tenant alias memory)
CREATE TABLE public.certificate_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  alias_normalized TEXT NOT NULL,
  alias_raw_example TEXT,
  certificate_type_id UUID NOT NULL REFERENCES public.certificate_types(id) ON DELETE CASCADE,
  confidence INTEGER NOT NULL DEFAULT 100 CHECK (confidence >= 0 AND confidence <= 100),
  created_by TEXT NOT NULL CHECK (created_by IN ('system', 'admin')),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, alias_normalized)
);

-- Create index for alias lookup
CREATE INDEX idx_certificate_aliases_lookup 
ON public.certificate_aliases (business_id, alias_normalized);

-- Enable RLS
ALTER TABLE public.certificate_aliases ENABLE ROW LEVEL SECURITY;

-- RLS policies for certificate_aliases
CREATE POLICY "Require authentication for certificate_aliases"
ON public.certificate_aliases FOR ALL
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view aliases for their business"
ON public.certificate_aliases FOR SELECT
USING (business_id = get_user_business_id(auth.uid()));

CREATE POLICY "Admins can insert aliases"
ON public.certificate_aliases FOR INSERT
WITH CHECK (
  business_id = get_user_business_id(auth.uid()) 
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
);

CREATE POLICY "Admins can update aliases"
ON public.certificate_aliases FOR UPDATE
USING (
  business_id = get_user_business_id(auth.uid()) 
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
);

CREATE POLICY "Admins can delete aliases"
ON public.certificate_aliases FOR DELETE
USING (
  business_id = get_user_business_id(auth.uid()) 
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
);

-- 1.3 Extend certificates table with new columns
ALTER TABLE public.certificates
ADD COLUMN title_raw TEXT,
ADD COLUMN title_normalized TEXT,
ADD COLUMN certificate_type_id UUID REFERENCES public.certificate_types(id) ON DELETE SET NULL,
ADD COLUMN needs_review BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN unmapped_reason TEXT,
ADD COLUMN unmapped_by UUID,
ADD COLUMN unmapped_at TIMESTAMPTZ;

-- 1.4 Performance indexes for review queue
CREATE INDEX idx_certificates_review_queue 
ON public.certificates (personnel_id, needs_review) 
WHERE needs_review = true;

CREATE INDEX idx_certificates_title_normalized 
ON public.certificates (personnel_id, title_normalized);

-- 1.5 Add feature flag to businesses table
ALTER TABLE public.businesses
ADD COLUMN use_canonical_certificates BOOLEAN NOT NULL DEFAULT false;

-- Trigger for updated_at on certificate_types
CREATE TRIGGER update_certificate_types_updated_at
BEFORE UPDATE ON public.certificate_types
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();