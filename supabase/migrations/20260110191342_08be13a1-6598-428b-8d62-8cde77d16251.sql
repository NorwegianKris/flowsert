-- Add new personal information columns to personnel table
ALTER TABLE public.personnel
ADD COLUMN nationality text,
ADD COLUMN gender text,
ADD COLUMN address text,
ADD COLUMN postal_code text,
ADD COLUMN postal_address text,
ADD COLUMN national_id text,
ADD COLUMN salary_account_number text,
ADD COLUMN language text DEFAULT 'Norwegian';

-- Add policy for workers to update their own personnel record
CREATE POLICY "Workers can update their own personnel record"
ON public.personnel
FOR UPDATE
USING (
  has_role(auth.uid(), 'worker'::app_role) 
  AND user_id = auth.uid()
);