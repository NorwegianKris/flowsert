

## Plan: Add is_test Toggle to Business Detail Sheet

### 1. Edge Function: `supabase/functions/update-platform-business/index.ts`

- Change validation: `business_id` is required, but `tier` and `is_test` are both optional (at least one must be provided)
- If `tier` is provided, update `entitlements` table as before
- If `is_test` is provided (boolean), update `businesses` table: `UPDATE businesses SET is_test = ? WHERE id = ?`

### 2. Component: `src/components/BusinessDetailSheet.tsx`

- Import `Switch` from `@/components/ui/switch`
- Add local state `localIsTest` initialized from `business.is_test` (reset when `business` changes)
- Add a "Status" section with a Switch toggle between Test/Active, placed after the Plan Tier section
- On toggle, call `update-platform-business` with `{ business_id, is_test: newValue }`, then call `onUpdated()` to refresh
- The badge in the header already reads from `business.is_test`, so it updates on refetch
- The delete button section already conditionally renders on `business.is_test`

### Files

| File | Change |
|------|--------|
| `supabase/functions/update-platform-business/index.ts` | Accept optional `is_test`, update `businesses` table |
| `src/components/BusinessDetailSheet.tsx` | Add Switch toggle for is_test status |

