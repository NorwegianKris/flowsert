-- Make sensitive storage buckets private (defense-in-depth)
-- RLS policies remain in place; this ensures URLs require auth headers
UPDATE storage.buckets 
SET public = false 
WHERE id IN ('certificate-documents', 'personnel-documents', 'project-documents');