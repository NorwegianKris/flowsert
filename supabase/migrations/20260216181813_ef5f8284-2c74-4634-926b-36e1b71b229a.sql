
-- Create issuer_types table (clone of certificate_types)
CREATE TABLE public.issuer_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id),
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.issuer_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Require authentication for issuer_types" ON public.issuer_types FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can view issuer types for their business" ON public.issuer_types FOR SELECT USING ((business_id = get_user_business_id(auth.uid())) OR (business_id IS NULL));
CREATE POLICY "Admins can insert issuer types" ON public.issuer_types FOR INSERT WITH CHECK ((business_id = get_user_business_id(auth.uid())) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role)));
CREATE POLICY "Admins can update issuer types" ON public.issuer_types FOR UPDATE USING ((business_id = get_user_business_id(auth.uid())) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role)));
CREATE POLICY "Admins can delete issuer types" ON public.issuer_types FOR DELETE USING ((business_id = get_user_business_id(auth.uid())) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role)));

-- Create issuer_aliases table (clone of certificate_aliases)
CREATE TABLE public.issuer_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id),
  issuer_type_id uuid NOT NULL REFERENCES public.issuer_types(id),
  alias_normalized text NOT NULL,
  alias_raw_example text,
  confidence integer NOT NULL DEFAULT 100,
  created_by text NOT NULL,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(business_id, alias_normalized)
);

ALTER TABLE public.issuer_aliases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Require authentication for issuer_aliases" ON public.issuer_aliases FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can view aliases for their business" ON public.issuer_aliases FOR SELECT USING (business_id = get_user_business_id(auth.uid()));
CREATE POLICY "Admins can insert issuer aliases" ON public.issuer_aliases FOR INSERT WITH CHECK ((business_id = get_user_business_id(auth.uid())) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role)));
CREATE POLICY "Admins can update issuer aliases" ON public.issuer_aliases FOR UPDATE USING ((business_id = get_user_business_id(auth.uid())) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role)));
CREATE POLICY "Admins can delete issuer aliases" ON public.issuer_aliases FOR DELETE USING ((business_id = get_user_business_id(auth.uid())) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role)));

-- Add issuer_type_id to certificates
ALTER TABLE public.certificates ADD COLUMN issuer_type_id uuid REFERENCES public.issuer_types(id);
