-- GREEN cleanup: drop broken duplicate policies that fail-closed
-- The "Secure delete/upload from project documents" policies already handle access correctly
DROP POLICY IF EXISTS "Admins can delete project documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload project documents" ON storage.objects;