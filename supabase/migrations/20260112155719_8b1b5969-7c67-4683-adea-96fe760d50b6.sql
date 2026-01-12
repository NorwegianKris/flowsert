-- Create feedback table for bug reports and improvement suggestions
CREATE TABLE public.feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  category TEXT NOT NULL CHECK (category IN ('bug', 'improvement', 'general_feedback')),
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert feedback for their business
CREATE POLICY "Users can submit feedback for their business"
ON public.feedback
FOR INSERT
WITH CHECK (
  business_id = public.get_user_business_id(auth.uid())
);

-- Allow admins to view all feedback for their business
CREATE POLICY "Admins can view feedback for their business"
ON public.feedback
FOR SELECT
USING (
  business_id = public.get_user_business_id(auth.uid())
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

-- Allow admins to delete feedback for their business
CREATE POLICY "Admins can delete feedback for their business"
ON public.feedback
FOR DELETE
USING (
  business_id = public.get_user_business_id(auth.uid())
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_feedback_updated_at
BEFORE UPDATE ON public.feedback
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();