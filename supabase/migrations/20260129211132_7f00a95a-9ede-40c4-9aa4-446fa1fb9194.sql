-- Drop the existing check constraint and add a new one that includes 'other'
ALTER TABLE public.availability DROP CONSTRAINT IF EXISTS availability_status_check;

ALTER TABLE public.availability ADD CONSTRAINT availability_status_check 
CHECK (status IN ('available', 'unavailable', 'partial', 'other'));