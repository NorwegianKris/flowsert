

## Step 4 -- Add Performance Index for Project Chat

### What This Does

Adds a composite index on `project_messages(project_id, created_at DESC)` to ensure efficient index scans for chat queries instead of sequential table scans.

### Migration SQL

```sql
CREATE INDEX IF NOT EXISTS project_messages_project_id_created_at_idx
  ON public.project_messages (project_id, created_at DESC);
```

### Technical Details

- Single database migration, no code changes
- Non-destructive, zero functional risk
- PostgreSQL can traverse the DESC index in reverse for ASC ordering (used by `ProjectChat.tsx`)
- `IF NOT EXISTS` makes it safe to re-run
- Skipping the optional `sender_id` index as no current queries filter by sender

