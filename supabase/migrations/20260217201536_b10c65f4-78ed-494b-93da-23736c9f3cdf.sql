ALTER TABLE public.personnel ALTER COLUMN category SET DEFAULT 'employee';

-- Also update any existing rows with the old default
UPDATE public.personnel SET category = 'employee' WHERE category = 'fixed_employee';