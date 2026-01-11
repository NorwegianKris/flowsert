-- Create certificate_categories table for business-defined certificate types
CREATE TABLE public.certificate_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(business_id, name)
);

-- Enable RLS
ALTER TABLE public.certificate_categories ENABLE ROW LEVEL SECURITY;

-- Policies: Users can view categories for their business
CREATE POLICY "Users can view their business certificate categories"
ON public.certificate_categories
FOR SELECT
USING (business_id = public.get_user_business_id(auth.uid()));

-- Admins can manage categories (correct function signature: user_id first, then role)
CREATE POLICY "Admins can insert certificate categories"
ON public.certificate_categories
FOR INSERT
WITH CHECK (
  business_id = public.get_user_business_id(auth.uid()) 
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

CREATE POLICY "Admins can update certificate categories"
ON public.certificate_categories
FOR UPDATE
USING (
  business_id = public.get_user_business_id(auth.uid()) 
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

CREATE POLICY "Admins can delete certificate categories"
ON public.certificate_categories
FOR DELETE
USING (
  business_id = public.get_user_business_id(auth.uid()) 
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- Create trigger for updated_at
CREATE TRIGGER update_certificate_categories_updated_at
BEFORE UPDATE ON public.certificate_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default categories for all existing businesses
INSERT INTO public.certificate_categories (business_id, name)
SELECT b.id, category.name
FROM public.businesses b
CROSS JOIN (
  VALUES ('Diving'), ('Medic'), ('Welding'), ('Drivers License'), ('Other')
) AS category(name)
ON CONFLICT (business_id, name) DO NOTHING;