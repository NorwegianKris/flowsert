-- Add issuing_authority column to certificates table
ALTER TABLE public.certificates
ADD COLUMN issuing_authority TEXT;