-- Create business-level document categories table (like certificate_categories)
CREATE TABLE public.document_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(business_id, name)
);

-- Enable RLS
ALTER TABLE public.document_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies (matching certificate_categories pattern exactly)
CREATE POLICY "Users can view their business document categories"
ON public.document_categories
FOR SELECT
USING (business_id = get_user_business_id(auth.uid()));

CREATE POLICY "Admins can insert document categories"
ON public.document_categories
FOR INSERT
WITH CHECK (
  (business_id = get_user_business_id(auth.uid())) 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can update document categories"
ON public.document_categories
FOR UPDATE
USING (
  (business_id = get_user_business_id(auth.uid())) 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete document categories"
ON public.document_categories
FOR DELETE
USING (
  (business_id = get_user_business_id(auth.uid())) 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Add trigger for updated_at
CREATE TRIGGER update_document_categories_updated_at
BEFORE UPDATE ON public.document_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update personnel_documents to reference business-level document_categories
ALTER TABLE public.personnel_documents 
DROP CONSTRAINT IF EXISTS personnel_documents_category_id_fkey;

ALTER TABLE public.personnel_documents
ADD CONSTRAINT personnel_documents_category_id_fkey
FOREIGN KEY (category_id) REFERENCES public.document_categories(id) ON DELETE SET NULL;