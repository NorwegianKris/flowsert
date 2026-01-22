-- Add activated column to personnel table
ALTER TABLE public.personnel 
ADD COLUMN activated boolean NOT NULL DEFAULT false;

-- Create helper function to check if personnel is activated
CREATE OR REPLACE FUNCTION public.is_personnel_activated(_personnel_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT activated FROM personnel WHERE id = _personnel_id),
    false
  );
$$;

-- Update certificate-documents storage policies to require activation for downloads
-- First drop existing policies
DROP POLICY IF EXISTS "Admins can download certificate documents" ON storage.objects;
DROP POLICY IF EXISTS "Workers can download their own certificate documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view certificate documents" ON storage.objects;
DROP POLICY IF EXISTS "Workers can view their own certificate documents" ON storage.objects;

-- Recreate with activation check for admins (workers can always access their own)
CREATE POLICY "Admins can download activated certificate documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'certificate-documents'
  AND auth.uid() IS NOT NULL
  AND has_role(auth.uid(), 'admin')
  AND is_personnel_activated((string_to_array(name, '/'))[1]::uuid)
);

CREATE POLICY "Workers can download their own certificate documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'certificate-documents'
  AND auth.uid() IS NOT NULL
  AND has_role(auth.uid(), 'worker')
  AND EXISTS (
    SELECT 1 FROM personnel p 
    WHERE p.id = (string_to_array(name, '/'))[1]::uuid 
    AND p.user_id = auth.uid()
  )
);

-- Update personnel-documents storage policies similarly
DROP POLICY IF EXISTS "Admins can download personnel documents" ON storage.objects;
DROP POLICY IF EXISTS "Workers can download their own personnel documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view personnel documents" ON storage.objects;
DROP POLICY IF EXISTS "Workers can view their own personnel documents" ON storage.objects;

CREATE POLICY "Admins can download activated personnel documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'personnel-documents'
  AND auth.uid() IS NOT NULL
  AND has_role(auth.uid(), 'admin')
  AND is_personnel_activated((string_to_array(name, '/'))[1]::uuid)
);

CREATE POLICY "Workers can download their own personnel documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'personnel-documents'
  AND auth.uid() IS NOT NULL
  AND has_role(auth.uid(), 'worker')
  AND EXISTS (
    SELECT 1 FROM personnel p 
    WHERE p.id = (string_to_array(name, '/'))[1]::uuid 
    AND p.user_id = auth.uid()
  )
);

-- Create function to check if personnel can be assigned to projects
CREATE OR REPLACE FUNCTION public.can_assign_personnel_to_project(_personnel_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT activated FROM personnel WHERE id = _personnel_id),
    false
  );
$$;