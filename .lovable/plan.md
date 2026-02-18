

## Phase 1.1 -- project_messages RLS: Close the Last Risk Pockets

### Current State (Already Correct)

The existing RLS policies on `project_messages` already implement **Option A** (invited workers can read, only assigned workers can send):

- **SELECT for workers**: Uses `can_worker_access_project()` which grants read access to both invited and assigned workers
- **INSERT for workers**: Checks `assigned_personnel` array only, meaning invited-but-not-assigned workers cannot send

This is the correct and recommended pattern.

### Changes Needed

**1. Rename policies for clarity**

Rename the worker INSERT policy from `"Workers can send project messages"` to `"Assigned workers can send project messages"` so the intent is immediately obvious to anyone auditing policies.

```sql
-- Drop old policy
DROP POLICY IF EXISTS "Workers can send project messages" ON project_messages;

-- Recreate with explicit name (same logic)
CREATE POLICY "Assigned workers can send project messages"
ON project_messages FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'worker'::app_role)
  AND sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM personnel per
    JOIN projects p ON per.id::text = ANY(p.assigned_personnel)
    WHERE per.user_id = auth.uid()
    AND p.id = project_messages.project_id
  )
);
```

**2. Add frontend guard for invited-only workers**

In `ProjectChat.tsx`, the message input area is always shown to workers, even if they are only invited (not assigned). When an invited worker tries to send, the RLS INSERT policy will block it and show a generic error. Instead, the UI should:

- Detect if the current worker is assigned (not just invited) to the project
- If only invited, hide the input area and show a notice: "You can view messages but cannot send until you accept the project invitation."

This requires passing an `isAssigned` prop or checking assignment status inside `ProjectChat`.

**3. Add a comment block in the migration**

Add a SQL comment documenting the access model so future developers understand the design intent.

### Technical Details

| Step | What | Where |
|------|-------|-------|
| Migration | Rename INSERT policy + add comment | Database migration |
| Frontend | Check worker assignment status, conditionally hide input | `ProjectChat.tsx` |
| Frontend | Pass assignment info or check inside component | `WorkerProjectDetail.tsx` or `ProjectChat.tsx` |

### No schema changes needed

The `project_messages` table schema is sufficient. No new columns or tables required.

