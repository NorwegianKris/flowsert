-- ============================================
-- FIX 1: Storage RLS Policies
-- The bug: policies used storage.foldername(p.name) instead of storage.foldername(storage.objects.name)
-- ============================================

-- Drop existing broken policies for certificate-documents
DROP POLICY IF EXISTS "Secure access to certificate documents" ON storage.objects;
DROP POLICY IF EXISTS "Secure upload to certificate documents" ON storage.objects;
DROP POLICY IF EXISTS "Secure delete from certificate documents" ON storage.objects;

-- Drop existing broken policies for personnel-documents
DROP POLICY IF EXISTS "Secure access to personnel documents" ON storage.objects;
DROP POLICY IF EXISTS "Secure upload to personnel documents" ON storage.objects;
DROP POLICY IF EXISTS "Secure delete from personnel documents" ON storage.objects;

-- Drop existing broken policies for project-documents
DROP POLICY IF EXISTS "Secure access to project documents" ON storage.objects;
DROP POLICY IF EXISTS "Secure upload to project documents" ON storage.objects;
DROP POLICY IF EXISTS "Secure delete from project documents" ON storage.objects;

-- ============================================
-- Certificate Documents - Fixed Policies
-- Uses storage.objects.name to avoid ambiguity with c.name or p.name
-- ============================================

CREATE POLICY "Secure access to certificate documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'certificate-documents' AND (
    -- Admins/managers can access certificates of personnel in their business
    ((has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')) AND EXISTS (
      SELECT 1 FROM certificates c
      JOIN personnel p ON p.id = c.personnel_id
      WHERE c.id::text = (storage.foldername(storage.objects.name))[1]
        AND p.business_id = get_user_business_id(auth.uid())
    ))
    OR
    -- Workers can access their own certificates
    (has_role(auth.uid(), 'worker') AND EXISTS (
      SELECT 1 FROM certificates c
      JOIN personnel p ON p.id = c.personnel_id
      WHERE c.id::text = (storage.foldername(storage.objects.name))[1]
        AND p.user_id = auth.uid()
    ))
  )
);

CREATE POLICY "Secure upload to certificate documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'certificate-documents' AND (
    -- Admins can upload certificates for personnel in their business
    (has_role(auth.uid(), 'admin') AND EXISTS (
      SELECT 1 FROM certificates c
      JOIN personnel p ON p.id = c.personnel_id
      WHERE c.id::text = (storage.foldername(storage.objects.name))[1]
        AND p.business_id = get_user_business_id(auth.uid())
    ))
    OR
    -- Workers can upload their own certificates
    (has_role(auth.uid(), 'worker') AND EXISTS (
      SELECT 1 FROM certificates c
      JOIN personnel p ON p.id = c.personnel_id
      WHERE c.id::text = (storage.foldername(storage.objects.name))[1]
        AND p.user_id = auth.uid()
    ))
  )
);

CREATE POLICY "Secure delete from certificate documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'certificate-documents' AND (
    -- Admins can delete certificates for personnel in their business
    (has_role(auth.uid(), 'admin') AND EXISTS (
      SELECT 1 FROM certificates c
      JOIN personnel p ON p.id = c.personnel_id
      WHERE c.id::text = (storage.foldername(storage.objects.name))[1]
        AND p.business_id = get_user_business_id(auth.uid())
    ))
    OR
    -- Workers can delete their own certificates
    (has_role(auth.uid(), 'worker') AND EXISTS (
      SELECT 1 FROM certificates c
      JOIN personnel p ON p.id = c.personnel_id
      WHERE c.id::text = (storage.foldername(storage.objects.name))[1]
        AND p.user_id = auth.uid()
    ))
  )
);

-- ============================================
-- Personnel Documents - Fixed Policies
-- ============================================

CREATE POLICY "Secure access to personnel documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'personnel-documents' AND (
    -- Admins/managers can access documents of personnel in their business
    ((has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')) AND EXISTS (
      SELECT 1 FROM personnel per
      WHERE per.id::text = (storage.foldername(storage.objects.name))[1]
        AND per.business_id = get_user_business_id(auth.uid())
    ))
    OR
    -- Workers can access their own documents
    (has_role(auth.uid(), 'worker') AND EXISTS (
      SELECT 1 FROM personnel per
      WHERE per.id::text = (storage.foldername(storage.objects.name))[1]
        AND per.user_id = auth.uid()
    ))
  )
);

CREATE POLICY "Secure upload to personnel documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'personnel-documents' AND (
    -- Admins can upload documents for personnel in their business
    (has_role(auth.uid(), 'admin') AND EXISTS (
      SELECT 1 FROM personnel per
      WHERE per.id::text = (storage.foldername(storage.objects.name))[1]
        AND per.business_id = get_user_business_id(auth.uid())
    ))
    OR
    -- Workers can upload their own documents
    (has_role(auth.uid(), 'worker') AND EXISTS (
      SELECT 1 FROM personnel per
      WHERE per.id::text = (storage.foldername(storage.objects.name))[1]
        AND per.user_id = auth.uid()
    ))
  )
);

CREATE POLICY "Secure delete from personnel documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'personnel-documents' AND (
    -- Admins can delete documents for personnel in their business
    (has_role(auth.uid(), 'admin') AND EXISTS (
      SELECT 1 FROM personnel per
      WHERE per.id::text = (storage.foldername(storage.objects.name))[1]
        AND per.business_id = get_user_business_id(auth.uid())
    ))
    OR
    -- Workers can delete their own documents
    (has_role(auth.uid(), 'worker') AND EXISTS (
      SELECT 1 FROM personnel per
      WHERE per.id::text = (storage.foldername(storage.objects.name))[1]
        AND per.user_id = auth.uid()
    ))
  )
);

-- ============================================
-- Project Documents - Fixed Policies
-- ============================================

CREATE POLICY "Secure access to project documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'project-documents' AND (
    -- Admins/managers can access documents of projects in their business
    ((has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')) AND EXISTS (
      SELECT 1 FROM projects proj
      WHERE proj.id::text = (storage.foldername(storage.objects.name))[1]
        AND proj.business_id = get_user_business_id(auth.uid())
    ))
    OR
    -- Workers can access documents of projects they are assigned to or invited to
    (has_role(auth.uid(), 'worker') AND EXISTS (
      SELECT 1 FROM projects proj
      WHERE proj.id::text = (storage.foldername(storage.objects.name))[1]
        AND can_worker_access_project(auth.uid(), proj.id)
    ))
  )
);

CREATE POLICY "Secure upload to project documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'project-documents' AND (
    -- Only admins can upload project documents
    has_role(auth.uid(), 'admin') AND EXISTS (
      SELECT 1 FROM projects proj
      WHERE proj.id::text = (storage.foldername(storage.objects.name))[1]
        AND proj.business_id = get_user_business_id(auth.uid())
    )
  )
);

CREATE POLICY "Secure delete from project documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'project-documents' AND (
    -- Only admins can delete project documents
    has_role(auth.uid(), 'admin') AND EXISTS (
      SELECT 1 FROM projects proj
      WHERE proj.id::text = (storage.foldername(storage.objects.name))[1]
        AND proj.business_id = get_user_business_id(auth.uid())
    )
  )
);

-- ============================================
-- FIX 2: Worker Project Assignment Functions
-- These allow workers to update project assignments via controlled RPC
-- ============================================

-- Function to add personnel to a project (when accepting invitation)
CREATE OR REPLACE FUNCTION add_personnel_to_project(
  _project_id uuid,
  _personnel_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_personnel text[];
BEGIN
  -- Verify the caller owns this personnel record
  IF NOT EXISTS (
    SELECT 1 FROM personnel 
    WHERE id = _personnel_id 
    AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Can only add yourself to a project';
  END IF;
  
  -- Verify there's a pending or accepted invitation for this personnel/project
  IF NOT EXISTS (
    SELECT 1 FROM project_invitations
    WHERE project_id = _project_id
    AND personnel_id = _personnel_id
    AND status IN ('pending', 'accepted')
  ) THEN
    RAISE EXCEPTION 'No valid invitation found';
  END IF;
  
  -- Get current personnel and add new one if not already there
  SELECT assigned_personnel INTO current_personnel
  FROM projects WHERE id = _project_id;
  
  IF NOT (_personnel_id::text = ANY(COALESCE(current_personnel, '{}'))) THEN
    UPDATE projects
    SET assigned_personnel = array_append(COALESCE(current_personnel, '{}'), _personnel_id::text),
        updated_at = now()
    WHERE id = _project_id;
  END IF;
  
  RETURN true;
END;
$$;

-- Function to remove personnel from a project (when declining invitation)
CREATE OR REPLACE FUNCTION remove_personnel_from_project(
  _project_id uuid,
  _personnel_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify the caller owns this personnel record
  IF NOT EXISTS (
    SELECT 1 FROM personnel 
    WHERE id = _personnel_id 
    AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Can only remove yourself from a project';
  END IF;
  
  -- Remove personnel from the project
  UPDATE projects
  SET assigned_personnel = array_remove(COALESCE(assigned_personnel, '{}'), _personnel_id::text),
      updated_at = now()
  WHERE id = _project_id;
  
  RETURN true;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION add_personnel_to_project(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION remove_personnel_from_project(uuid, uuid) TO authenticated;