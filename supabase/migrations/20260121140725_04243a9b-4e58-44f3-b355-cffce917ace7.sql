-- Drop overly permissive existing policies and replace with secure ones
DROP POLICY IF EXISTS "Anyone can view personnel documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete personnel documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update personnel documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload personnel documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view project documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete certificate documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload certificate documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view certificate documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can access certificate documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can access project documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can access personnel documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload personnel documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete personnel documents" ON storage.objects;

-- Create secure certificate-documents policies
CREATE POLICY "Secure access to certificate documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'certificate-documents' AND
  (
    (
      (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role)) AND
      EXISTS (
        SELECT 1 FROM personnel p 
        WHERE (storage.foldername(name))[1] = p.id::text 
        AND p.business_id = get_user_business_id(auth.uid())
      )
    )
    OR
    (
      has_role(auth.uid(), 'worker'::app_role) AND
      EXISTS (
        SELECT 1 FROM personnel p 
        WHERE (storage.foldername(name))[1] = p.id::text 
        AND p.user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Secure upload to certificate documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'certificate-documents' AND
  (
    (
      has_role(auth.uid(), 'admin'::app_role) AND
      EXISTS (
        SELECT 1 FROM personnel p 
        WHERE (storage.foldername(name))[1] = p.id::text 
        AND p.business_id = get_user_business_id(auth.uid())
      )
    )
    OR
    (
      has_role(auth.uid(), 'worker'::app_role) AND
      EXISTS (
        SELECT 1 FROM personnel p 
        WHERE (storage.foldername(name))[1] = p.id::text 
        AND p.user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Secure delete from certificate documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'certificate-documents' AND
  (
    (
      has_role(auth.uid(), 'admin'::app_role) AND
      EXISTS (
        SELECT 1 FROM personnel p 
        WHERE (storage.foldername(name))[1] = p.id::text 
        AND p.business_id = get_user_business_id(auth.uid())
      )
    )
    OR
    (
      has_role(auth.uid(), 'worker'::app_role) AND
      EXISTS (
        SELECT 1 FROM personnel p 
        WHERE (storage.foldername(name))[1] = p.id::text 
        AND p.user_id = auth.uid()
      )
    )
  )
);

-- Create secure project-documents policies
CREATE POLICY "Secure access to project documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'project-documents' AND
  EXISTS (
    SELECT 1 FROM projects p 
    WHERE (storage.foldername(name))[1] = p.id::text 
    AND p.business_id = get_user_business_id(auth.uid())
  )
);

-- Create secure personnel-documents policies
CREATE POLICY "Secure access to personnel documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'personnel-documents' AND
  EXISTS (
    SELECT 1 FROM personnel p 
    WHERE (storage.foldername(name))[1] = p.id::text 
    AND can_access_personnel(auth.uid(), p.id)
  )
);

CREATE POLICY "Secure upload to personnel documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'personnel-documents' AND
  EXISTS (
    SELECT 1 FROM personnel p 
    WHERE (storage.foldername(name))[1] = p.id::text 
    AND can_access_personnel(auth.uid(), p.id)
  )
);

CREATE POLICY "Secure delete from personnel documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'personnel-documents' AND
  EXISTS (
    SELECT 1 FROM personnel p 
    WHERE (storage.foldername(name))[1] = p.id::text 
    AND can_access_personnel(auth.uid(), p.id)
  )
);