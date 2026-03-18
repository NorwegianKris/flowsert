CREATE OR REPLACE FUNCTION public.seed_default_entitlements()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.entitlements (business_id, tier, is_active, profile_cap, is_unlimited, monthly_ocr_cap, monthly_chat_cap, monthly_search_cap)
  VALUES (NEW.id, 'starter', true, 25, false, 50, 200, 50)
  ON CONFLICT (business_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_seed_entitlements
AFTER INSERT ON public.businesses
FOR EACH ROW EXECUTE FUNCTION public.seed_default_entitlements();