
## Allow Workers to View Project Details and Cancel Pending Applications

### What changes

Currently, clicking a project card that already has an application does nothing (`!application && setSelectedProject(project)` blocks it). This change will:

1. Always allow opening the project detail popup, regardless of application status
2. Show project details in all cases
3. If the worker has a **pending** application: show a "Cancel Application" button instead of the submit form
4. If the application is **accepted** or **rejected**: show a read-only view with the status (no cancel option)
5. If no application exists: show the current apply form as-is

### Technical Details

**Database: Add DELETE RLS policy for `project_applications`**

Workers currently cannot delete their own applications (no DELETE policy exists). A migration will add:

```sql
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
```

This only allows deleting applications with `status = 'pending'`, so accepted/rejected records are preserved.

**File: `src/hooks/useProjectApplications.ts`**

Add a `cancelApplication` function that deletes a pending application by ID:

```typescript
const cancelApplication = async (applicationId: string): Promise<boolean> => {
  // DELETE from project_applications where id = applicationId
  // Show toast on success/failure
  // Return boolean
};
```

Return `cancelApplication` from the hook.

**File: `src/components/PostedProjects.tsx`**

1. Remove the `!application &&` guard on the card click handler -- always call `setSelectedProject(project)`
2. Track the current application for the selected project in the dialog
3. Update the dialog content to show three states:
   - **No application**: Current apply form (message textarea + Submit button)
   - **Pending application**: Project details + "Cancel Application" button (destructive style)
   - **Accepted/Rejected**: Project details + read-only status badge, no actions
4. On successful cancel, refresh `myApplications` state
5. Import `cancelApplication` from the hook
