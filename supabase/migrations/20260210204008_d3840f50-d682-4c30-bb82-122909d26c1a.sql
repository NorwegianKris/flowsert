-- Fix overly permissive avatar storage policies
DROP POLICY IF EXISTS "Users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete avatars" ON storage.objects;

-- Users can only upload to their own folder (personnel_id)
CREATE POLICY "Users can upload their own avatars"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
  AND (
    -- Admin can upload for any personnel in their business
    (public.has_role(auth.uid(), 'admin') AND EXISTS (
      SELECT 1 FROM public.personnel p
      WHERE p.business_id = public.get_user_business_id(auth.uid())
      AND (storage.foldername(name))[1] = p.id::text
    ))
    OR
    -- Workers can upload their own avatar
    EXISTS (
      SELECT 1 FROM public.personnel p
      WHERE p.user_id = auth.uid()
      AND (storage.foldername(name))[1] = p.id::text
    )
    OR
    -- Allow business-level uploads (e.g. email-logo)
    (public.has_role(auth.uid(), 'admin') AND NOT (name LIKE '%/%'))
  )
);

-- Users can only update their own avatars (or admin for their business)
CREATE POLICY "Users can update their own avatars"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
  AND (
    (public.has_role(auth.uid(), 'admin') AND EXISTS (
      SELECT 1 FROM public.personnel p
      WHERE p.business_id = public.get_user_business_id(auth.uid())
      AND (storage.foldername(name))[1] = p.id::text
    ))
    OR
    EXISTS (
      SELECT 1 FROM public.personnel p
      WHERE p.user_id = auth.uid()
      AND (storage.foldername(name))[1] = p.id::text
    )
    OR
    (public.has_role(auth.uid(), 'admin') AND NOT (name LIKE '%/%'))
  )
);

-- Users can only delete their own avatars (or admin for their business)
CREATE POLICY "Users can delete their own avatars"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
  AND (
    (public.has_role(auth.uid(), 'admin') AND EXISTS (
      SELECT 1 FROM public.personnel p
      WHERE p.business_id = public.get_user_business_id(auth.uid())
      AND (storage.foldername(name))[1] = p.id::text
    ))
    OR
    EXISTS (
      SELECT 1 FROM public.personnel p
      WHERE p.user_id = auth.uid()
      AND (storage.foldername(name))[1] = p.id::text
    )
    OR
    (public.has_role(auth.uid(), 'admin') AND NOT (name LIKE '%/%'))
  )
);