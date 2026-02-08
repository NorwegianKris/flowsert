-- First, drop the existing check constraint
ALTER TABLE personnel DROP CONSTRAINT IF EXISTS personnel_category_check;

-- Update the data while there's no constraint
-- Convert all fixed_employee to employee
UPDATE personnel SET category = 'employee' WHERE category = 'fixed_employee';

-- Convert all job seekers to freelancers  
UPDATE personnel SET is_job_seeker = false, category = 'freelancer' WHERE is_job_seeker = true;

-- Now add the new constraint with the updated valid values
ALTER TABLE personnel ADD CONSTRAINT personnel_category_check 
  CHECK (category IS NULL OR category IN ('employee', 'freelancer'));