-- Create departments table for business-defined departments
CREATE TABLE public.departments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(business_id, name)
);

-- Enable RLS
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Require authentication for departments"
  ON public.departments
  AS RESTRICTIVE
  FOR ALL
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view their business departments"
  ON public.departments
  FOR SELECT
  USING (business_id = get_user_business_id(auth.uid()));

CREATE POLICY "Admins can insert departments"
  ON public.departments
  FOR INSERT
  WITH CHECK (
    business_id = get_user_business_id(auth.uid()) 
    AND has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admins can update departments"
  ON public.departments
  FOR UPDATE
  USING (
    business_id = get_user_business_id(auth.uid()) 
    AND has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admins can delete departments"
  ON public.departments
  FOR DELETE
  USING (
    business_id = get_user_business_id(auth.uid()) 
    AND has_role(auth.uid(), 'admin'::app_role)
  );

-- Add trigger for updated_at
CREATE TRIGGER update_departments_updated_at
  BEFORE UPDATE ON public.departments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();