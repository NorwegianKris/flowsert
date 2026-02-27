ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS recurring_interval_days INTEGER,
  ADD COLUMN IF NOT EXISTS recurring_interval_label TEXT,
  ADD COLUMN IF NOT EXISTS recurring_next_date TIMESTAMPTZ;