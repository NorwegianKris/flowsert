

## Add Database Constraints to project_messages

Three CHECK constraints will be added to the `project_messages` table to prevent invalid data from entering through any code path:

### Constraints

| Constraint | Rule | Purpose |
|---|---|---|
| `project_messages_sender_role_check` | `sender_role IN ('admin', 'worker')` | Prevents garbage or spoofed role values |
| `project_messages_content_not_empty` | `length(trim(content)) > 0` | Blocks empty/whitespace-only messages |
| `project_messages_sender_name_not_empty` | `length(trim(sender_name)) > 0` | Blocks empty sender names since the column is stored denormalized |

### Technical Details

- Single database migration adding all three constraints
- No code changes needed -- these are backend-only guards
- Existing data should already comply (messages require content and sender info in the UI)
- These are immutable CHECK constraints (no time-based logic), so they are safe to use directly

