-- P0: Fix cross-tenant storage gap on project-documents bucket
-- Drop and recreate DELETE and INSERT policies with business_id scoping

DROP POLICY IF EXISTS "Admins can delete project documents" ON storage.objects;
CREATE POLICY "Admins can delete project documents" ON storage.objects
FOR DELETE USING (
  bucket_id = 'project-documents'
  AND has_role(auth.uid(), 'admin')
  AND EXISTS (
    SELECT 1 FROM projects proj
    WHERE proj.id::text = (storage.foldername(name))[1]
    AND proj.business_id = get_user_business_id(auth.uid())
  )
);

DROP POLICY IF EXISTS "Admins can upload project documents" ON storage.objects;
CREATE POLICY "Admins can upload project documents" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'project-documents'
  AND has_role(auth.uid(), 'admin')
  AND EXISTS (
    SELECT 1 FROM projects proj
    WHERE proj.id::text = (storage.foldername(name))[1]
    AND proj.business_id = get_user_business_id(auth.uid())
  )
);