-- Security Hardening: Require authentication for all sensitive tables
-- These policies layer on top of existing business/role-based policies

-- profiles table
CREATE POLICY "Require authentication for profiles"
ON public.profiles FOR ALL
USING (auth.uid() IS NOT NULL);

-- personnel table
CREATE POLICY "Require authentication for personnel"
ON public.personnel FOR ALL
USING (auth.uid() IS NOT NULL);

-- businesses table
CREATE POLICY "Require authentication for businesses"
ON public.businesses FOR ALL
USING (auth.uid() IS NOT NULL);

-- invitations table
CREATE POLICY "Require authentication for invitations"
ON public.invitations FOR ALL
USING (auth.uid() IS NOT NULL);

-- certificates table
CREATE POLICY "Require authentication for certificates"
ON public.certificates FOR ALL
USING (auth.uid() IS NOT NULL);

-- personnel_documents table
CREATE POLICY "Require authentication for personnel_documents"
ON public.personnel_documents FOR ALL
USING (auth.uid() IS NOT NULL);

-- project_documents table
CREATE POLICY "Require authentication for project_documents"
ON public.project_documents FOR ALL
USING (auth.uid() IS NOT NULL);

-- business_documents table
CREATE POLICY "Require authentication for business_documents"
ON public.business_documents FOR ALL
USING (auth.uid() IS NOT NULL);

-- projects table
CREATE POLICY "Require authentication for projects"
ON public.projects FOR ALL
USING (auth.uid() IS NOT NULL);

-- feedback table
CREATE POLICY "Require authentication for feedback"
ON public.feedback FOR ALL
USING (auth.uid() IS NOT NULL);

-- availability table
CREATE POLICY "Require authentication for availability"
ON public.availability FOR ALL
USING (auth.uid() IS NOT NULL);

-- user_roles table
CREATE POLICY "Require authentication for user_roles"
ON public.user_roles FOR ALL
USING (auth.uid() IS NOT NULL);

-- project_invitations table
CREATE POLICY "Require authentication for project_invitations"
ON public.project_invitations FOR ALL
USING (auth.uid() IS NOT NULL);

-- certificate_categories table
CREATE POLICY "Require authentication for certificate_categories"
ON public.certificate_categories FOR ALL
USING (auth.uid() IS NOT NULL);

-- document_categories table
CREATE POLICY "Require authentication for document_categories"
ON public.document_categories FOR ALL
USING (auth.uid() IS NOT NULL);

-- worker_categories table
CREATE POLICY "Require authentication for worker_categories"
ON public.worker_categories FOR ALL
USING (auth.uid() IS NOT NULL);

-- project_calendar_items table
CREATE POLICY "Require authentication for project_calendar_items"
ON public.project_calendar_items FOR ALL
USING (auth.uid() IS NOT NULL);

-- personnel_document_categories table
CREATE POLICY "Require authentication for personnel_document_categories"
ON public.personnel_document_categories FOR ALL
USING (auth.uid() IS NOT NULL);

-- project_document_categories table
CREATE POLICY "Require authentication for project_document_categories"
ON public.project_document_categories FOR ALL
USING (auth.uid() IS NOT NULL);