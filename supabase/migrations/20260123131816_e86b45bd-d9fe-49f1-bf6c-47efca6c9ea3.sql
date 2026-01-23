-- Add last_login_at column to personnel table to track when users last logged in
ALTER TABLE public.personnel 
ADD COLUMN last_login_at timestamp with time zone DEFAULT NULL;