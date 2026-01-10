-- Add next of kin columns to personnel table
ALTER TABLE public.personnel
ADD COLUMN next_of_kin_name text,
ADD COLUMN next_of_kin_relation text,
ADD COLUMN next_of_kin_phone text;