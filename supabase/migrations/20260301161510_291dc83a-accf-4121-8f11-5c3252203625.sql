
-- Part A: Trigger function to auto-seed default certificate categories on business creation
CREATE OR REPLACE FUNCTION public.seed_default_certificate_categories()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  default_categories TEXT[] := ARRAY[
    'Health & Safety',
    'First Aid & Medical',
    'Lifting & Rigging',
    'Electrical',
    'Welding',
    'Mechanical',
    'NDT / Inspection',
    'Diving',
    'Maritime / STCW',
    'Crane & Heavy Equipment',
    'Scaffolding',
    'Rope Access & Working at Heights',
    'Hazardous Materials & Chemicals',
    'Fire Safety & Emergency Response',
    'Management & Supervision',
    'Trade Certifications',
    'Regulatory / Compliance',
    'Driver & Operator Licenses',
    'Other'
  ];
  cat_name TEXT;
BEGIN
  FOREACH cat_name IN ARRAY default_categories LOOP
    INSERT INTO public.certificate_categories (business_id, name)
    SELECT NEW.id, cat_name
    WHERE NOT EXISTS (
      SELECT 1 FROM public.certificate_categories
      WHERE business_id = NEW.id AND name = cat_name
    );
  END LOOP;
  RETURN NEW;
END;
$$;

-- Create trigger on businesses table
CREATE TRIGGER trg_seed_default_certificate_categories
  AFTER INSERT ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.seed_default_certificate_categories();

-- Part B: Backfill existing businesses with missing default categories
INSERT INTO public.certificate_categories (business_id, name)
SELECT b.id, cat_name
FROM public.businesses b
CROSS JOIN unnest(ARRAY[
  'Health & Safety',
  'First Aid & Medical',
  'Lifting & Rigging',
  'Electrical',
  'Welding',
  'Mechanical',
  'NDT / Inspection',
  'Diving',
  'Maritime / STCW',
  'Crane & Heavy Equipment',
  'Scaffolding',
  'Rope Access & Working at Heights',
  'Hazardous Materials & Chemicals',
  'Fire Safety & Emergency Response',
  'Management & Supervision',
  'Trade Certifications',
  'Regulatory / Compliance',
  'Driver & Operator Licenses',
  'Other'
]) AS cat_name
WHERE NOT EXISTS (
  SELECT 1 FROM public.certificate_categories cc
  WHERE cc.business_id = b.id AND cc.name = cat_name
);
