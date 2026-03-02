
-- Seed trigger function for default issuer types on business creation
CREATE OR REPLACE FUNCTION public.seed_default_issuer_types()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  default_issuers TEXT[] := ARRAY[
    'DNV',
    'Lloyd''s Register',
    'Bureau Veritas',
    'OPITO',
    'Nautical Institute',
    'NEBOSH',
    'IOSH',
    'City & Guilds',
    'ECITB',
    'LEEA',
    'CISRS',
    'GWO',
    'IMCA',
    'TUV',
    'ClassNK',
    'American Bureau of Shipping',
    'Korean Register',
    'RINA',
    'SGS',
    'Intertek',
    'BSI',
    'Norwegian Maritime Authority',
    'UK Maritime and Coastguard Agency',
    'Maritime New Zealand',
    'AMSA',
    'NOGEPA',
    'Oil & Gas UK',
    'IADC',
    'IWCF',
    'WeldTech',
    'TWI',
    'PCN',
    'BINDT',
    'NACE International',
    'CompEx',
    'Red Cross',
    'St John Ambulance',
    'EFA Awards',
    'Highfield Qualifications',
    'Qualsafe Awards',
    'ProTrainings'
  ];
  issuer_name TEXT;
  v_issuer_type_id UUID;
BEGIN
  FOREACH issuer_name IN ARRAY default_issuers LOOP
    -- Insert issuer type if not exists
    INSERT INTO public.issuer_types (business_id, name)
    SELECT NEW.id, issuer_name
    WHERE NOT EXISTS (
      SELECT 1 FROM public.issuer_types
      WHERE business_id = NEW.id AND name = issuer_name
    );

    -- Get the issuer type id (whether just inserted or pre-existing)
    SELECT id INTO v_issuer_type_id
    FROM public.issuer_types
    WHERE business_id = NEW.id AND name = issuer_name
    LIMIT 1;

    -- Create matching alias if not exists
    IF v_issuer_type_id IS NOT NULL THEN
      INSERT INTO public.issuer_aliases (business_id, issuer_type_id, alias_normalized, alias_raw_example, created_by, confidence)
      SELECT NEW.id, v_issuer_type_id, lower(trim(issuer_name)), issuer_name, 'system', 100
      WHERE NOT EXISTS (
        SELECT 1 FROM public.issuer_aliases
        WHERE business_id = NEW.id AND alias_normalized = lower(trim(issuer_name))
      );
    END IF;
  END LOOP;
  RETURN NEW;
END;
$function$;

-- Attach trigger to businesses table
CREATE TRIGGER trg_seed_default_issuer_types
  AFTER INSERT ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.seed_default_issuer_types();

-- Backfill existing businesses
DO $$
DECLARE
  v_business RECORD;
  default_issuers TEXT[] := ARRAY[
    'DNV',
    'Lloyd''s Register',
    'Bureau Veritas',
    'OPITO',
    'Nautical Institute',
    'NEBOSH',
    'IOSH',
    'City & Guilds',
    'ECITB',
    'LEEA',
    'CISRS',
    'GWO',
    'IMCA',
    'TUV',
    'ClassNK',
    'American Bureau of Shipping',
    'Korean Register',
    'RINA',
    'SGS',
    'Intertek',
    'BSI',
    'Norwegian Maritime Authority',
    'UK Maritime and Coastguard Agency',
    'Maritime New Zealand',
    'AMSA',
    'NOGEPA',
    'Oil & Gas UK',
    'IADC',
    'IWCF',
    'WeldTech',
    'TWI',
    'PCN',
    'BINDT',
    'NACE International',
    'CompEx',
    'Red Cross',
    'St John Ambulance',
    'EFA Awards',
    'Highfield Qualifications',
    'Qualsafe Awards',
    'ProTrainings'
  ];
  issuer_name TEXT;
  v_issuer_type_id UUID;
BEGIN
  FOR v_business IN SELECT id FROM public.businesses LOOP
    FOREACH issuer_name IN ARRAY default_issuers LOOP
      INSERT INTO public.issuer_types (business_id, name)
      SELECT v_business.id, issuer_name
      WHERE NOT EXISTS (
        SELECT 1 FROM public.issuer_types
        WHERE business_id = v_business.id AND name = issuer_name
      );

      SELECT id INTO v_issuer_type_id
      FROM public.issuer_types
      WHERE business_id = v_business.id AND name = issuer_name
      LIMIT 1;

      IF v_issuer_type_id IS NOT NULL THEN
        INSERT INTO public.issuer_aliases (business_id, issuer_type_id, alias_normalized, alias_raw_example, created_by, confidence)
        SELECT v_business.id, v_issuer_type_id, lower(trim(issuer_name)), issuer_name, 'system', 100
        WHERE NOT EXISTS (
          SELECT 1 FROM public.issuer_aliases
          WHERE business_id = v_business.id AND alias_normalized = lower(trim(issuer_name))
        );
      END IF;
    END LOOP;
  END LOOP;
END $$;
