-- Create project document categories table
CREATE TABLE public.project_document_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create project documents table
CREATE TABLE public.project_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.project_document_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  uploaded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.project_document_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_documents ENABLE ROW LEVEL SECURITY;

-- RLS policies for project_document_categories
CREATE POLICY "Users can view document categories for their business projects"
ON public.project_document_categories
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_document_categories.project_id
    AND p.business_id = get_user_business_id(auth.uid())
  )
);

CREATE POLICY "Admins can insert document categories"
ON public.project_document_categories
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin') AND
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_document_categories.project_id
    AND p.business_id = get_user_business_id(auth.uid())
  )
);

CREATE POLICY "Admins can update document categories"
ON public.project_document_categories
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin') AND
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_document_categories.project_id
    AND p.business_id = get_user_business_id(auth.uid())
  )
);

CREATE POLICY "Admins can delete document categories"
ON public.project_document_categories
FOR DELETE
USING (
  has_role(auth.uid(), 'admin') AND
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_document_categories.project_id
    AND p.business_id = get_user_business_id(auth.uid())
  )
);

-- RLS policies for project_documents
CREATE POLICY "Users can view documents for their business projects"
ON public.project_documents
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_documents.project_id
    AND p.business_id = get_user_business_id(auth.uid())
  )
);

CREATE POLICY "Admins can insert documents"
ON public.project_documents
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin') AND
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_documents.project_id
    AND p.business_id = get_user_business_id(auth.uid())
  )
);

CREATE POLICY "Admins can update documents"
ON public.project_documents
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin') AND
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_documents.project_id
    AND p.business_id = get_user_business_id(auth.uid())
  )
);

CREATE POLICY "Admins can delete documents"
ON public.project_documents
FOR DELETE
USING (
  has_role(auth.uid(), 'admin') AND
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_documents.project_id
    AND p.business_id = get_user_business_id(auth.uid())
  )
);

-- Create triggers for updated_at
CREATE TRIGGER update_project_document_categories_updated_at
BEFORE UPDATE ON public.project_document_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_project_documents_updated_at
BEFORE UPDATE ON public.project_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for project documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-documents', 'project-documents', true);

-- Storage policies for project documents bucket
CREATE POLICY "Authenticated users can view project documents"
ON storage.objects
FOR SELECT
USING (bucket_id = 'project-documents' AND auth.role() = 'authenticated');

CREATE POLICY "Admins can upload project documents"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'project-documents' AND 
  has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can delete project documents"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'project-documents' AND 
  has_role(auth.uid(), 'admin')
);