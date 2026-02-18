CREATE POLICY "Workers can delete their own pending applications"
  ON project_applications
  FOR DELETE
  USING (
    status = 'pending'
    AND EXISTS (
      SELECT 1 FROM personnel p
      WHERE p.id = project_applications.personnel_id
      AND p.user_id = auth.uid()
    )
  );