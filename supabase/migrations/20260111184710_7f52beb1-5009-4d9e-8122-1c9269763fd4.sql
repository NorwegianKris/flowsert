-- Add category field to personnel table
ALTER TABLE public.personnel 
ADD COLUMN category TEXT DEFAULT 'fixed_employee' CHECK (category IN ('fixed_employee', 'freelancer'));