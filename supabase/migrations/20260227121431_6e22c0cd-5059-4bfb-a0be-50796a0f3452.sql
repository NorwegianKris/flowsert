
-- 1. Add monthly AI cap columns to entitlements
ALTER TABLE public.entitlements
  ADD COLUMN IF NOT EXISTS monthly_ocr_cap integer NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS monthly_chat_cap integer NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS monthly_search_cap integer NOT NULL DEFAULT 200;

-- 2. Set tier defaults for existing rows
UPDATE public.entitlements SET monthly_ocr_cap = 200, monthly_chat_cap = 500, monthly_search_cap = 1000 WHERE tier = 'starter';
UPDATE public.entitlements SET monthly_ocr_cap = 2147483647, monthly_chat_cap = 2147483647, monthly_search_cap = 2147483647 WHERE tier = 'enterprise';

-- 3. Create check_ai_allowance function
CREATE OR REPLACE FUNCTION public.check_ai_allowance(
  p_business_id uuid,
  p_event_type text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_cap integer;
  v_used bigint;
  v_ledger_event text;
  v_cap_column text;
BEGIN
  -- Map abstract event type to usage_ledger event_type and entitlements cap column
  IF p_event_type = 'ocr' THEN
    v_ledger_event := 'ocr_extraction';
    v_cap_column := 'monthly_ocr_cap';
  ELSIF p_event_type = 'chat' THEN
    v_ledger_event := 'assistant_query';
    v_cap_column := 'monthly_chat_cap';
  ELSIF p_event_type = 'search' THEN
    v_ledger_event := 'personnel_match';
    v_cap_column := 'monthly_search_cap';
  ELSE
    RETURN jsonb_build_object('allowed', false, 'reason', 'unknown_event_type');
  END IF;

  -- Get cap for this business from entitlements
  EXECUTE format('SELECT %I FROM public.entitlements WHERE business_id = $1', v_cap_column)
  INTO v_cap
  USING p_business_id;

  IF v_cap IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'no_entitlement_record');
  END IF;

  -- Count usage events this calendar month from usage_ledger
  SELECT COUNT(*) INTO v_used
  FROM public.usage_ledger
  WHERE business_id = p_business_id
    AND event_type = v_ledger_event
    AND created_at >= date_trunc('month', now());

  IF v_used >= v_cap THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'monthly_cap_reached', 'used', v_used, 'cap', v_cap);
  END IF;

  RETURN jsonb_build_object('allowed', true, 'used', v_used, 'cap', v_cap);
END;
$$;

-- Revoke direct execution from public/anon roles
REVOKE EXECUTE ON FUNCTION public.check_ai_allowance(uuid, text) FROM public;
REVOKE EXECUTE ON FUNCTION public.check_ai_allowance(uuid, text) FROM anon;
-- Grant to authenticated (edge functions use service role, but keep consistent)
GRANT EXECUTE ON FUNCTION public.check_ai_allowance(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_ai_allowance(uuid, text) TO service_role;
