-- Backfill title_raw and title_normalized from certificate name for existing records
UPDATE certificates
SET 
  title_raw = name,
  title_normalized = lower(regexp_replace(name, '[^a-zA-Z0-9\s]', ' ', 'g'))
WHERE title_raw IS NULL
  AND title_normalized IS NULL
  AND name IS NOT NULL;