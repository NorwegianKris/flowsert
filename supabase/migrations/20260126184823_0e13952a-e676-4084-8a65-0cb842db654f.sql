-- Add is_posted column to projects table for posted/advertised projects
ALTER TABLE public.projects
ADD COLUMN is_posted boolean NOT NULL DEFAULT false;