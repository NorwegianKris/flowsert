

## Plan: Business Detail View + Delete Business

### 1. Enrich `list-platform-businesses` response

Add `admin_email` to each business in the existing edge function. Query the `invitations` table for the most recent admin invitation per business and include it in the response. This avoids needing a separate detail-fetch endpoint.

### 2. New Component: `src/components/BusinessDetailSheet.tsx`

A Sheet (slide-over from right) that receives the selected `PlatformBusiness` object and displays:

- Business name + logo avatar
- Plan tier as an editable Select dropdown (Starter/Growth/Professional). On change, calls `list-platform-businesses`'s sibling pattern — a direct `supabase.functions.invoke('update-platform-business-tier')` ... actually, simpler: call a new lightweight edge function `update-platform-business` that updates the `entitlements` table tier + profile_cap for the given business_id.
- Admin email (read-only, from the enriched data)
- Active personnel count
- Created date
- Is test badge

**Delete section** (only rendered when `is_test === true`):
- Red "Delete Business" button at the bottom
- Clicking opens an AlertDialog requiring the user to type the exact business name
- Delete button in the dialog is disabled until input matches business name exactly
- On confirm, calls `delete-platform-business` edge function
- On success, closes both the dialog and sheet, refreshes the list

### 3. New Edge Function: `supabase/functions/update-platform-business/index.ts`

- Verifies caller is `hello@flowsert.com` via `getUser(token)`
- Accepts `{ business_id, tier }`
- Updates `entitlements` table: `tier` and `profile_cap` (using the same tier-to-cap mapping)
- Returns success

### 4. New Edge Function: `supabase/functions/delete-platform-business/index.ts`

- Verifies caller is `hello@flowsert.com` via `getUser(token)`
- Accepts `{ business_id }`
- Fetches the business row and **hard blocks** if `is_test !== true`
- Uses service role to cascade delete in order:
  1. `certificates` (via personnel_id IN personnel for this business)
  2. `personnel_documents` (via personnel_id)
  3. `personnel_worker_groups` (via personnel_id)
  4. `data_processing_acknowledgements` (by business_id)
  5. `availability` (via personnel_id)
  6. `direct_messages` (via personnel_id)
  7. `personnel` (by business_id)
  8. `project_messages`, `project_calendar_items`, `project_phases`, `project_events`, `project_invitations`, `project_document_categories`, `project_documents` (via project_id IN projects for this business)
  9. `project_applications` (by business_id)
  10. `projects` (by business_id)
  11. `notification_recipients` (via notification_id IN notifications for this business)
  12. `notifications` (by business_id)
  13. `invitations` (by business_id)
  14. `certificate_aliases`, `certificate_categories`, `certificate_types` (by business_id)
  15. `issuer_aliases`, `issuer_types` (by business_id)
  16. `worker_categories`, `worker_groups` (by business_id)
  17. `departments` (by business_id)
  18. `freelancer_invitations` (by business_id)
  19. `feedback` (by business_id)
  20. `usage_ledger` (by business_id)
  21. `audit_logs` (by business_id)
  22. `billing_customers`, `billing_subscriptions`, `billing_events` (by business_id)
  23. `business_documents` (by business_id)
  24. `profiles` (set business_id = NULL where business_id matches)
  25. `user_roles` (for users whose profile was in this business)
  26. `entitlements` (by business_id)
  27. `businesses` (the row itself)
- Returns `{ success: true }`

### 5. Config: `supabase/config.toml`

Add:
```toml
[functions.delete-platform-business]
verify_jwt = false

[functions.update-platform-business]
verify_jwt = false
```

### 6. Updated: `src/pages/PlatformDashboard.tsx`

- Add `admin_email` to `PlatformBusiness` interface
- Add state for selected business (`selectedBusiness`)
- Make table rows clickable (`onClick` → set selected business)
- Render `BusinessDetailSheet` with the selected business
- Pass `onClose`, `onDeleted`, and `onUpdated` callbacks that refresh the list

### Files

| File | Change |
|------|--------|
| `supabase/functions/list-platform-businesses/index.ts` | Add admin_email to response |
| `supabase/functions/update-platform-business/index.ts` | New — update tier |
| `supabase/functions/delete-platform-business/index.ts` | New — cascade delete test businesses |
| `supabase/config.toml` | Register two new functions |
| `src/components/BusinessDetailSheet.tsx` | New — detail view + delete |
| `src/pages/PlatformDashboard.tsx` | Clickable rows + sheet integration |

