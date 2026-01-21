-- Set default value for location column so admins don't need to fill it
ALTER TABLE public.personnel ALTER COLUMN location SET DEFAULT 'Not specified';