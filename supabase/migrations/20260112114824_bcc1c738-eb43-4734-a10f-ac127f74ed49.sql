-- Add department column to personnel table
ALTER TABLE public.personnel ADD COLUMN IF NOT EXISTS department text;