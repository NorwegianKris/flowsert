-- Add business details columns to businesses table
ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS postal_code text,
ADD COLUMN IF NOT EXISTS postal_address text,
ADD COLUMN IF NOT EXISTS website text,
ADD COLUMN IF NOT EXISTS org_number text,
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS logo_url text;

-- Create business_documents table for universally shared documents
CREATE TABLE public.business_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  uploaded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.business_documents ENABLE ROW LEVEL SECURITY;

-- Admins can manage business documents
CREATE POLICY "Admins can insert business documents"
ON public.business_documents
FOR INSERT
WITH CHECK (
  business_id = get_user_business_id(auth.uid()) 
  AND has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can update business documents"
ON public.business_documents
FOR UPDATE
USING (
  business_id = get_user_business_id(auth.uid()) 
  AND has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can delete business documents"
ON public.business_documents
FOR DELETE
USING (
  business_id = get_user_business_id(auth.uid()) 
  AND has_role(auth.uid(), 'admin')
);

-- All users in the business can view business documents
CREATE POLICY "Users can view their business documents"
ON public.business_documents
FOR SELECT
USING (business_id = get_user_business_id(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_business_documents_updated_at
BEFORE UPDATE ON public.business_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for business documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('business-documents', 'business-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for business-documents bucket
CREATE POLICY "Admins can upload business documents"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'business-documents'
  AND has_role(auth.uid(), 'admin')
  AND (storage.foldername(name))[1] = get_user_business_id(auth.uid())::text
);

CREATE POLICY "Admins can update business documents storage"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'business-documents'
  AND has_role(auth.uid(), 'admin')
  AND (storage.foldername(name))[1] = get_user_business_id(auth.uid())::text
);

CREATE POLICY "Admins can delete business documents storage"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'business-documents'
  AND has_role(auth.uid(), 'admin')
  AND (storage.foldername(name))[1] = get_user_business_id(auth.uid())::text
);

CREATE POLICY "Users can view their business documents storage"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'business-documents'
  AND (storage.foldername(name))[1] = get_user_business_id(auth.uid())::text
);