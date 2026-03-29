

## Plan: Fix `can_worker_access_project` to filter on accepted invitations

### Problem
The `can_worker_access_project` function's first `EXISTS` subquery joins `project_invitations` without filtering on `status`, allowing workers with rejected/expired/pending invitations to access project data.

### Change
Create a migration that replaces the function, adding `AND pi.status = 'accepted'` to the `project_invitations` subquery.

```sql
CREATE OR REPLACE FUNCTION public.can_worker_access_project(_user_id uuid, _project_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_invitations pi
    JOIN personnel per ON per.id = pi.personnel_id
    WHERE pi.project_id = _project_id
    AND per.user_id = _user_id
    AND pi.status = 'accepted'
  )
  OR EXISTS (
    SELECT 1 FROM personnel per
    JOIN projects p ON per.id::text = ANY(p.assigned_personnel)
    WHERE per.user_id = _user_id
    AND p.id = _project_id
  )
$$;
```

### Risk
Q1/Q3: 🔴 — This is a security-critical RLS helper function. Anchor before publish.

