-- Add custom_domain field to businesses table
ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS custom_domain text;