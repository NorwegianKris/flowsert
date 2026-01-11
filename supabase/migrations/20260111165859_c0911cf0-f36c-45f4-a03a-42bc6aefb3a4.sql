-- Add is_milestone column to project_calendar_items table
ALTER TABLE public.project_calendar_items
ADD COLUMN is_milestone BOOLEAN NOT NULL DEFAULT false;