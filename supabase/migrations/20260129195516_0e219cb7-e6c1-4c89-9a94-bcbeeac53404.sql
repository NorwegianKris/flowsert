-- Add column to track if expiry notification was already sent for each certificate
ALTER TABLE public.certificates
ADD COLUMN expiry_notification_sent boolean NOT NULL DEFAULT false;