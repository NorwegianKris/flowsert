-- Create worker_categories table (similar to certificate_categories and document_categories)
CREATE TABLE public.worker_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(business_id, name)
);

-- Enable Row Level Security
ALTER TABLE public.worker_categories ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their business worker categories"
ON public.worker_categories
FOR SELECT
USING (business_id = get_user_business_id(auth.uid()));

CREATE POLICY "Admins can insert worker categories"
ON public.worker_categories
FOR INSERT
WITH CHECK ((business_id = get_user_business_id(auth.uid())) AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update worker categories"
ON public.worker_categories
FOR UPDATE
USING ((business_id = get_user_business_id(auth.uid())) AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete worker categories"
ON public.worker_categories
FOR DELETE
USING ((business_id = get_user_business_id(auth.uid())) AND has_role(auth.uid(), 'admin'::app_role));