-- Create storage bucket for certificate documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('certificate-documents', 'certificate-documents', true);

-- Allow authenticated users to upload certificate documents for their business
CREATE POLICY "Users can upload certificate documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'certificate-documents' AND
  EXISTS (
    SELECT 1 FROM public.certificates c
    JOIN public.personnel p ON c.personnel_id = p.id
    WHERE c.id::text = (storage.foldername(storage.objects.name))[1]
    AND p.business_id = public.get_user_business_id(auth.uid())
  )
);

-- Allow authenticated users to view certificate documents for their business
CREATE POLICY "Users can view certificate documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'certificate-documents' AND
  EXISTS (
    SELECT 1 FROM public.certificates c
    JOIN public.personnel p ON c.personnel_id = p.id
    WHERE c.id::text = (storage.foldername(storage.objects.name))[1]
    AND p.business_id = public.get_user_business_id(auth.uid())
  )
);

-- Allow authenticated users to delete certificate documents for their business
CREATE POLICY "Users can delete certificate documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'certificate-documents' AND
  EXISTS (
    SELECT 1 FROM public.certificates c
    JOIN public.personnel p ON c.personnel_id = p.id
    WHERE c.id::text = (storage.foldername(storage.objects.name))[1]
    AND p.business_id = public.get_user_business_id(auth.uid())
  )
);