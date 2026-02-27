
DO $$
DECLARE
  v_business_id uuid := '38672512-2331-4546-8bc4-de942605fce1';

  cat_diving uuid;
  cat_drivers uuid;
  cat_medical uuid;
  cat_hydraulic uuid;
  cat_lifting uuid;
  cat_other uuid;
  cat_welding uuid;
  cat_safety uuid;
  cat_equipment uuid;

BEGIN

  SELECT id INTO cat_diving FROM certificate_categories WHERE business_id = v_business_id AND name = 'Diving';
  SELECT id INTO cat_drivers FROM certificate_categories WHERE business_id = v_business_id AND name = 'Drivers License';
  SELECT id INTO cat_medical FROM certificate_categories WHERE business_id = v_business_id AND name = 'Medical & Health';
  SELECT id INTO cat_hydraulic FROM certificate_categories WHERE business_id = v_business_id AND name = 'Hydraulic';
  SELECT id INTO cat_lifting FROM certificate_categories WHERE business_id = v_business_id AND name = 'Lifting';
  SELECT id INTO cat_other FROM certificate_categories WHERE business_id = v_business_id AND name = 'Regulatory & Identity';
  SELECT id INTO cat_welding FROM certificate_categories WHERE business_id = v_business_id AND name = 'Welding';
  SELECT id INTO cat_safety FROM certificate_categories WHERE business_id = v_business_id AND name = 'Safety & Emergency';
  SELECT id INTO cat_equipment FROM certificate_categories WHERE business_id = v_business_id AND name = 'Equipment & Operations';

  -- SAFETY & EMERGENCY
  INSERT INTO certificate_types (id, business_id, category_id, name, is_active, created_at, updated_at) VALUES
    (gen_random_uuid(), v_business_id, cat_safety, 'BOSIET with CA-EBS', true, now(), now()),
    (gen_random_uuid(), v_business_id, cat_safety, 'FOET with CA-EBS', true, now(), now()),
    (gen_random_uuid(), v_business_id, cat_safety, 'CA-EBS Initial Deployment', true, now(), now()),
    (gen_random_uuid(), v_business_id, cat_safety, 'HUET with CA-EBS', true, now(), now()),
    (gen_random_uuid(), v_business_id, cat_safety, 'AED / Basic Life Support', true, now(), now()),
    (gen_random_uuid(), v_business_id, cat_safety, 'H2S Awareness', true, now(), now()),
    (gen_random_uuid(), v_business_id, cat_safety, 'Fall Arrest & Working at Height', true, now(), now()),
    (gen_random_uuid(), v_business_id, cat_safety, 'STCW Advanced Fire Fighting', true, now(), now()),
    (gen_random_uuid(), v_business_id, cat_safety, 'GWO Basic Safety Training', true, now(), now()),
    (gen_random_uuid(), v_business_id, cat_safety, 'Escape Chute & Norwegian Suit', true, now(), now()),
    (gen_random_uuid(), v_business_id, cat_safety, 'Minimum Industry Safety Training (MIST)', true, now(), now()),
    (gen_random_uuid(), v_business_id, cat_safety, 'Offshore Emergency Response Team Member', true, now(), now()),
    (gen_random_uuid(), v_business_id, cat_safety, 'Security Awareness Training for Seafarers', true, now(), now())
  ON CONFLICT (business_id, name) DO NOTHING;

  -- DIVING
  INSERT INTO certificate_types (id, business_id, category_id, name, is_active, created_at, updated_at) VALUES
    (gen_random_uuid(), v_business_id, cat_diving, 'CSWIP 3.1U Diver Inspector', true, now(), now()),
    (gen_random_uuid(), v_business_id, cat_diving, 'CSWIP 3.2U Diver Inspector', true, now(), now()),
    (gen_random_uuid(), v_business_id, cat_diving, 'IDSA Level 3 Surface Supplied Diver', true, now(), now()),
    (gen_random_uuid(), v_business_id, cat_diving, 'PSA Surface Orientated Diver', true, now(), now()),
    (gen_random_uuid(), v_business_id, cat_diving, 'PSA Class 1 (IMCA/HSE/NDC)', true, now(), now()),
    (gen_random_uuid(), v_business_id, cat_diving, 'NLIA Class B', true, now(), now()),
    (gen_random_uuid(), v_business_id, cat_diving, 'Inshore Supervisor', true, now(), now()),
    (gen_random_uuid(), v_business_id, cat_diving, 'Mixed Gas Closed Bell / Saturation Diver', true, now(), now()),
    (gen_random_uuid(), v_business_id, cat_diving, 'Saturation License', true, now(), now()),
    (gen_random_uuid(), v_business_id, cat_diving, 'Dutch Saturation License (Category B/C)', true, now(), now()),
    (gen_random_uuid(), v_business_id, cat_diving, 'Kompetansebevis F1', true, now(), now()),
    (gen_random_uuid(), v_business_id, cat_diving, 'COBRA Familiarisation Course', true, now(), now()),
    (gen_random_uuid(), v_business_id, cat_diving, 'Australian Diver Accreditation Scheme (ADAS)', true, now(), now()),
    (gen_random_uuid(), v_business_id, cat_diving, 'Surface Supplied Diver Certificate', true, now(), now()),
    (gen_random_uuid(), v_business_id, cat_diving, 'IMCA Offshore Diving Supervisor', true, now(), now())
  ON CONFLICT (business_id, name) DO NOTHING;

  -- LIFTING
  INSERT INTO certificate_types (id, business_id, category_id, name, is_active, created_at, updated_at) VALUES
    (gen_random_uuid(), v_business_id, cat_lifting, 'Rigger / Slinger & Banksman G11', true, now(), now()),
    (gen_random_uuid(), v_business_id, cat_lifting, 'Kompetansebevis G11/G20', true, now(), now()),
    (gen_random_uuid(), v_business_id, cat_lifting, 'Offshore Crane Operator', true, now(), now()),
    (gen_random_uuid(), v_business_id, cat_lifting, 'Boat Skipper Category B', true, now(), now())
  ON CONFLICT (business_id, name) DO NOTHING;

  -- MEDICAL & HEALTH
  INSERT INTO certificate_types (id, business_id, category_id, name, is_active, created_at, updated_at) VALUES
    (gen_random_uuid(), v_business_id, cat_medical, 'Offshore Diving Medical (DMAC 11)', true, now(), now()),
    (gen_random_uuid(), v_business_id, cat_medical, 'Offshore Fitness Medical', true, now(), now()),
    (gen_random_uuid(), v_business_id, cat_medical, 'OGUK Medical', true, now(), now()),
    (gen_random_uuid(), v_business_id, cat_medical, 'Diver Medic Technician (DMT)', true, now(), now()),
    (gen_random_uuid(), v_business_id, cat_medical, 'Offshore Diving First Aid', true, now(), now()),
    (gen_random_uuid(), v_business_id, cat_medical, 'Oxygen Provider', true, now(), now()),
    (gen_random_uuid(), v_business_id, cat_medical, 'Seamans Medical', true, now(), now()),
    (gen_random_uuid(), v_business_id, cat_medical, 'NYD First Aid Certificate', true, now(), now())
  ON CONFLICT (business_id, name) DO NOTHING;

  -- HYDRAULIC
  INSERT INTO certificate_types (id, business_id, category_id, name, is_active, created_at, updated_at) VALUES
    (gen_random_uuid(), v_business_id, cat_hydraulic, 'Hydrotight Tension Subsea Bolted Connections', true, now(), now())
  ON CONFLICT (business_id, name) DO NOTHING;

  -- WELDING
  INSERT INTO certificate_types (id, business_id, category_id, name, is_active, created_at, updated_at) VALUES
    (gen_random_uuid(), v_business_id, cat_welding, 'Welding Certificate', true, now(), now())
  ON CONFLICT (business_id, name) DO NOTHING;

  -- DRIVERS LICENSE
  INSERT INTO certificate_types (id, business_id, category_id, name, is_active, created_at, updated_at) VALUES
    (gen_random_uuid(), v_business_id, cat_drivers, 'Drivers License — Car (Category B)', true, now(), now()),
    (gen_random_uuid(), v_business_id, cat_drivers, 'Drivers License — Heavy Vehicle', true, now(), now())
  ON CONFLICT (business_id, name) DO NOTHING;

  -- REGULATORY & IDENTITY
  INSERT INTO certificate_types (id, business_id, category_id, name, is_active, created_at, updated_at) VALUES
    (gen_random_uuid(), v_business_id, cat_other, 'Havtil NS-9610', true, now(), now()),
    (gen_random_uuid(), v_business_id, cat_other, 'Offshore Declaration of Health', true, now(), now()),
    (gen_random_uuid(), v_business_id, cat_other, 'Passport', true, now(), now()),
    (gen_random_uuid(), v_business_id, cat_other, 'Seamans Discharge Book', true, now(), now()),
    (gen_random_uuid(), v_business_id, cat_other, 'Seamansbook', true, now(), now()),
    (gen_random_uuid(), v_business_id, cat_other, 'Seamans Discharge Card', true, now(), now()),
    (gen_random_uuid(), v_business_id, cat_other, 'SRC & VHF Radio License', true, now(), now()),
    (gen_random_uuid(), v_business_id, cat_other, 'Navigation License (NDC)', true, now(), now()),
    (gen_random_uuid(), v_business_id, cat_other, 'Training Certificate', true, now(), now()),
    (gen_random_uuid(), v_business_id, cat_other, 'VCA Safety Certificate', true, now(), now()),
    (gen_random_uuid(), v_business_id, cat_other, 'STCW Basic Safety (VI/1)', true, now(), now())
  ON CONFLICT (business_id, name) DO NOTHING;

  -- EQUIPMENT & OPERATIONS
  INSERT INTO certificate_types (id, business_id, category_id, name, is_active, created_at, updated_at) VALUES
    (gen_random_uuid(), v_business_id, cat_equipment, 'Machine Operation Certificate', true, now(), now())
  ON CONFLICT (business_id, name) DO NOTHING;

END $$;
