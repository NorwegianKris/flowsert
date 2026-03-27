-- Performance indexes for frequently searched/filtered columns
CREATE INDEX IF NOT EXISTS idx_certificates_name ON public.certificates (name);
CREATE INDEX IF NOT EXISTS idx_certificates_expiry_date ON public.certificates (expiry_date);
CREATE INDEX IF NOT EXISTS idx_personnel_location ON public.personnel (location);
CREATE INDEX IF NOT EXISTS idx_personnel_role ON public.personnel (role);
CREATE INDEX IF NOT EXISTS idx_personnel_business_id ON public.personnel (business_id);
CREATE INDEX IF NOT EXISTS idx_personnel_activated ON public.personnel (activated);