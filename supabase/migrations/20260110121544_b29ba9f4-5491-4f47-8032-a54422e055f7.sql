-- Create projects table
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'pending')),
  start_date DATE NOT NULL,
  end_date DATE,
  assigned_personnel TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Admins can view projects in their business
CREATE POLICY "Admins can view projects in their business"
ON public.projects
FOR SELECT
USING (
  business_id = get_user_business_id(auth.uid()) 
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);

-- Admins can insert projects in their business
CREATE POLICY "Admins can insert projects in their business"
ON public.projects
FOR INSERT
WITH CHECK (
  business_id = get_user_business_id(auth.uid()) 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Admins can update projects in their business
CREATE POLICY "Admins can update projects in their business"
ON public.projects
FOR UPDATE
USING (
  business_id = get_user_business_id(auth.uid()) 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Admins can delete projects in their business
CREATE POLICY "Admins can delete projects in their business"
ON public.projects
FOR DELETE
USING (
  business_id = get_user_business_id(auth.uid()) 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Create project calendar items table
CREATE TABLE public.project_calendar_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.project_calendar_items ENABLE ROW LEVEL SECURITY;

-- Users can view calendar items for projects they can access
CREATE POLICY "Users can view project calendar items"
ON public.project_calendar_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_calendar_items.project_id
    AND p.business_id = get_user_business_id(auth.uid())
  )
);

-- Admins can insert calendar items
CREATE POLICY "Admins can insert project calendar items"
ON public.project_calendar_items
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_calendar_items.project_id
    AND p.business_id = get_user_business_id(auth.uid())
    AND has_role(auth.uid(), 'admin'::app_role)
  )
);

-- Admins can update calendar items
CREATE POLICY "Admins can update project calendar items"
ON public.project_calendar_items
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_calendar_items.project_id
    AND p.business_id = get_user_business_id(auth.uid())
    AND has_role(auth.uid(), 'admin'::app_role)
  )
);

-- Admins can delete calendar items
CREATE POLICY "Admins can delete project calendar items"
ON public.project_calendar_items
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_calendar_items.project_id
    AND p.business_id = get_user_business_id(auth.uid())
    AND has_role(auth.uid(), 'admin'::app_role)
  )
);

-- Add updated_at triggers
CREATE TRIGGER update_projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_project_calendar_items_updated_at
BEFORE UPDATE ON public.project_calendar_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();