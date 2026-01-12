-- Create project_invitations table to track project invitations sent to personnel
CREATE TABLE public.project_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  personnel_id UUID NOT NULL REFERENCES public.personnel(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  responded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, personnel_id)
);

-- Enable Row Level Security
ALTER TABLE public.project_invitations ENABLE ROW LEVEL SECURITY;

-- Create policies for admin access (admins can view all invitations for their business)
CREATE POLICY "Admins can view all project invitations" 
ON public.project_invitations 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.profiles pr ON pr.business_id = p.business_id
    WHERE p.id = project_invitations.project_id
    AND pr.id = auth.uid()
  )
);

CREATE POLICY "Admins can create project invitations" 
ON public.project_invitations 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.profiles pr ON pr.business_id = p.business_id
    WHERE p.id = project_invitations.project_id
    AND pr.id = auth.uid()
  )
);

CREATE POLICY "Admins can update project invitations" 
ON public.project_invitations 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.profiles pr ON pr.business_id = p.business_id
    WHERE p.id = project_invitations.project_id
    AND pr.id = auth.uid()
  )
);

CREATE POLICY "Admins can delete project invitations" 
ON public.project_invitations 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.profiles pr ON pr.business_id = p.business_id
    WHERE p.id = project_invitations.project_id
    AND pr.id = auth.uid()
  )
);

-- Workers can view their own invitations
CREATE POLICY "Workers can view their own invitations" 
ON public.project_invitations 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.personnel per
    WHERE per.id = project_invitations.personnel_id
    AND per.user_id = auth.uid()
  )
);

-- Workers can update their own invitations (to accept/decline)
CREATE POLICY "Workers can respond to their own invitations" 
ON public.project_invitations 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.personnel per
    WHERE per.id = project_invitations.personnel_id
    AND per.user_id = auth.uid()
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_project_invitations_updated_at
BEFORE UPDATE ON public.project_invitations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_project_invitations_project_id ON public.project_invitations(project_id);
CREATE INDEX idx_project_invitations_personnel_id ON public.project_invitations(personnel_id);
CREATE INDEX idx_project_invitations_status ON public.project_invitations(status);