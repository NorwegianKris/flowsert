-- Add certificate expiry notification preference to personnel table
ALTER TABLE public.personnel
ADD COLUMN certificate_expiry_notifications boolean NOT NULL DEFAULT false;