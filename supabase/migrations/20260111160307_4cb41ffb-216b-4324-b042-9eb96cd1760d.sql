-- Add category_id to certificates table
ALTER TABLE public.certificates
ADD COLUMN category_id UUID REFERENCES public.certificate_categories(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX idx_certificates_category_id ON public.certificates(category_id);