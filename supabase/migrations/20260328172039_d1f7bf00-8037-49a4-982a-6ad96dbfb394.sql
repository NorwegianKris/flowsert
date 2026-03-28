
-- Fix: Scope admin mutation policies on personnel_document_categories to the admin's own business
-- by joining through the personnel table to verify business_id matches.

-- Drop existing unscoped policies
DROP POLICY IF EXISTS "Admins can delete document categories" ON public.personnel_document_categories;
DROP POLICY IF EXISTS "Admins can insert document categories" ON public.personnel_document_categories;
DROP POLICY IF EXISTS "Admins can update document categories" ON public.personnel_document_categories;

-- Recreate with business_id scoping through personnel table
CREATE POLICY "Admins can insert document categories"
ON public.personnel_document_categories FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.personnel p
    WHERE p.id = personnel_document_categories.personnel_id
      AND p.business_id = get_user_business_id(auth.uid())
  )
);

CREATE POLICY "Admins can update document categories"
ON public.personnel_document_categories FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.personnel p
    WHERE p.id = personnel_document_categories.personnel_id
      AND p.business_id = get_user_business_id(auth.uid())
  )
);

CREATE POLICY "Admins can delete document categories"
ON public.personnel_document_categories FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.personnel p
    WHERE p.id = personnel_document_categories.personnel_id
      AND p.business_id = get_user_business_id(auth.uid())
  )
);
