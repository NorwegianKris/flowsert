

## Plan: Businesses List View with `is_test` Column

### 1. Database Migration

Add `is_test` boolean column to `businesses` table, defaulting to `false`. No name-pattern inference.

```sql
ALTER TABLE public.businesses ADD COLUMN is_test boolean NOT NULL DEFAULT false;
```

### 2. New Edge Function: `supabase/functions/list-platform-businesses/index.ts`

- Verifies caller is `hello@flowsert.com` via auth token
- Uses service role client to query all businesses with:
  - Business fields: `id`, `name`, `logo_url`, `created_at`, `is_test`
  - Entitlement tier (left join `entitlements`, default `'starter'`)
  - Active personnel count (count from `personnel` where `activated = true`)
- Returns JSON array

Config: Add `[functions.list-platform-businesses]` with `verify_jwt = false` to `supabase/config.toml`.

### 3. Updated: `src/pages/PlatformDashboard.tsx`

Replace placeholder card with:
- **Header**: "Businesses" title + "Add Business" button (placeholder toast for now)
- **Loading state**: Skeleton rows
- **Empty state**: Building2 icon + "No businesses yet"
- **Table/cards**: Each row shows:
  - Logo (avatar fallback to Building2 icon) + name
  - Tier badge (from entitlements)
  - Active personnel count
  - Created date (formatted)
  - Status tag: **"Test"** if `is_test === true`, **"Active"** if `false` — based on the database column, not name inference

Fetches on mount via the edge function with the user's session token.

### Files

| File | Change |
|------|--------|
| SQL migration | Add `is_test` column to `businesses` |
| `supabase/functions/list-platform-businesses/index.ts` | New edge function |
| `supabase/config.toml` | Register new function |
| `src/pages/PlatformDashboard.tsx` | Full businesses list view |

