-- Add bio field for job seekers to describe themselves
ALTER TABLE public.personnel 
ADD COLUMN bio text;