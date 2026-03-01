ALTER TABLE public.certificates
ADD COLUMN rescan_previous_data jsonb DEFAULT NULL;