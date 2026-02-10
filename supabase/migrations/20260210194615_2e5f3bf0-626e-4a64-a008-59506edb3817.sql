
CREATE TABLE public.project_phases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  color TEXT DEFAULT 'primary',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.project_phases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view phases for projects in their business"
ON public.project_phases
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.profiles pr ON pr.business_id = p.business_id
    WHERE p.id = project_phases.project_id AND pr.id = auth.uid()
  )
);

CREATE POLICY "Admins can insert phases"
ON public.project_phases
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.profiles pr ON pr.business_id = p.business_id
    WHERE p.id = project_phases.project_id AND pr.id = auth.uid()
  )
);

CREATE POLICY "Admins can update phases"
ON public.project_phases
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.profiles pr ON pr.business_id = p.business_id
    WHERE p.id = project_phases.project_id AND pr.id = auth.uid()
  )
);

CREATE POLICY "Admins can delete phases"
ON public.project_phases
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.profiles pr ON pr.business_id = p.business_id
    WHERE p.id = project_phases.project_id AND pr.id = auth.uid()
  )
);
