

## Rotation Schedule + Back-to-Back Shifts

**Status: Implemented**

### Database
- Added 10 columns to `projects`: `rotation_on_days`, `rotation_off_days`, `rotation_count`, `rotations_completed`, `auto_close_enabled`, `next_close_date`, `next_open_date`, `is_shift_parent`, `shift_group_id`, `shift_number`
- Created `project_events` table with RLS (SELECT for same-business, INSERT for admin, UPDATE/DELETE denied)
- Added `INTERNAL_CRON_SECRET` to secrets

### Edge Function
- `auto-close-projects`: Secret-gated cron function that auto-closes/reopens rotations, takes compliance snapshots, and warns about unstaffed shifts starting within 7 days

### Files Changed
- `src/hooks/useProjects.ts` — New fields in interfaces, multi-insert for back-to-back shifts
- `src/components/AddProjectDialog.tsx` — On/off period inputs, rotation count, auto-close toggle, back-to-back toggle with naming preview and shift schedule preview
- `src/components/EditProjectDialog.tsx` — Read-only rotation and shift info display
- `src/components/ProjectsTab.tsx` — Grouped shift cards, rotation status badges
- `src/components/ProjectDetail.tsx` — Shift badge, sibling shift navigation tabs
- `supabase/functions/auto-close-projects/index.ts` — New edge function
- `supabase/config.toml` — Added auto-close-projects function config

### Pending
- Cron job scheduling (requires insert tool with secret value — do NOT put in migration)
- ProjectDetail shift tabs for crew management per shift (currently shows sibling navigation)
- Compliance date scoping against shift-specific dates in certificate views
