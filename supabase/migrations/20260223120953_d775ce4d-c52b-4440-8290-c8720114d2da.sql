
-- Change default for activated column to true
ALTER TABLE public.personnel ALTER COLUMN activated SET DEFAULT true;

-- Backfill all existing rows to activated = true
UPDATE public.personnel SET activated = true WHERE activated = false;
