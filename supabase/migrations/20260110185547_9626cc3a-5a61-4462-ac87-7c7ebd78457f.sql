-- Add policy allowing workers to insert certificates for their own personnel record
CREATE POLICY "Workers can insert their own certificates" 
ON public.certificates 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'worker'::app_role) 
  AND EXISTS (
    SELECT 1 FROM personnel p 
    WHERE p.id = personnel_id 
    AND p.user_id = auth.uid()
  )
);

-- Add policy allowing workers to update their own certificates
CREATE POLICY "Workers can update their own certificates" 
ON public.certificates 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'worker'::app_role) 
  AND EXISTS (
    SELECT 1 FROM personnel p 
    WHERE p.id = personnel_id 
    AND p.user_id = auth.uid()
  )
);

-- Add policy allowing workers to delete their own certificates
CREATE POLICY "Workers can delete their own certificates" 
ON public.certificates 
FOR DELETE 
USING (
  has_role(auth.uid(), 'worker'::app_role) 
  AND EXISTS (
    SELECT 1 FROM personnel p 
    WHERE p.id = personnel_id 
    AND p.user_id = auth.uid()
  )
);