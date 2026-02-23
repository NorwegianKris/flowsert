BEGIN;

DROP POLICY IF EXISTS "Workers can download their own certificate documents" ON storage.objects;
DROP POLICY IF EXISTS "Workers can download their own personnel documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can download activated certificate documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can download activated personnel documents" ON storage.objects;

COMMIT;