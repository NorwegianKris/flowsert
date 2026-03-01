ALTER TABLE public.certificates
  ADD COLUMN place_of_issue_lat double precision,
  ADD COLUMN place_of_issue_lon double precision;