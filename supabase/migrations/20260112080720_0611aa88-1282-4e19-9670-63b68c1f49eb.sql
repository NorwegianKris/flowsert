-- Create personnel document categories table
CREATE TABLE public.personnel_document_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  personnel_id UUID NOT NULL REFERENCES public.personnel(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create personnel documents table
CREATE TABLE public.personnel_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  personnel_id UUID NOT NULL REFERENCES public.personnel(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.personnel_document_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.personnel_document_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personnel_documents ENABLE ROW LEVEL SECURITY;

-- RLS policies for personnel_document_categories
CREATE POLICY "Users can view document categories for accessible personnel"
ON public.personnel_document_categories
FOR SELECT
USING (public.can_access_personnel(auth.uid(), personnel_id));

CREATE POLICY "Admins can insert document categories"
ON public.personnel_document_categories
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update document categories"
ON public.personnel_document_categories
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete document categories"
ON public.personnel_document_categories
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- RLS policies for personnel_documents
CREATE POLICY "Users can view documents for accessible personnel"
ON public.personnel_documents
FOR SELECT
USING (public.can_access_personnel(auth.uid(), personnel_id));

CREATE POLICY "Users can insert documents for accessible personnel"
ON public.personnel_documents
FOR INSERT
WITH CHECK (public.can_access_personnel(auth.uid(), personnel_id));

CREATE POLICY "Users can update documents for accessible personnel"
ON public.personnel_documents
FOR UPDATE
USING (public.can_access_personnel(auth.uid(), personnel_id));

CREATE POLICY "Users can delete documents for accessible personnel"
ON public.personnel_documents
FOR DELETE
USING (public.can_access_personnel(auth.uid(), personnel_id));

-- Create trigger for updated_at
CREATE TRIGGER update_personnel_document_categories_updated_at
BEFORE UPDATE ON public.personnel_document_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_personnel_documents_updated_at
BEFORE UPDATE ON public.personnel_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for personnel documents
INSERT INTO storage.buckets (id, name, public) VALUES ('personnel-documents', 'personnel-documents', true);

-- Storage policies
CREATE POLICY "Anyone can view personnel documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'personnel-documents');

CREATE POLICY "Authenticated users can upload personnel documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'personnel-documents' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update personnel documents"
ON storage.objects FOR UPDATE
USING (bucket_id = 'personnel-documents' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete personnel documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'personnel-documents' AND auth.role() = 'authenticated');