

## Plan: Add Enterprise Tier Option

Three files need the "enterprise" tier added:

### 1. `src/components/CreateBusinessDialog.tsx`
Add `<SelectItem value="enterprise">Enterprise</SelectItem>` after the Professional option in the Plan Tier dropdown.

### 2. `supabase/functions/create-platform-business/index.ts`
Add `case "enterprise": return 2147483647;` to the `getTierProfileCap` switch (matching the database function `get_tier_profile_limit`).

### 3. `supabase/functions/update-platform-business/index.ts`
Add `case "enterprise": return 2147483647;` to its `getTierProfileCap` switch.

### 4. `src/components/BusinessDetailSheet.tsx`
Add `<SelectItem value="enterprise">Enterprise</SelectItem>` after the Professional option (line 203).

| File | Change |
|------|--------|
| `src/components/CreateBusinessDialog.tsx` | Add Enterprise SelectItem |
| `src/components/BusinessDetailSheet.tsx` | Add Enterprise SelectItem |
| `supabase/functions/create-platform-business/index.ts` | Add enterprise case to getTierProfileCap |
| `supabase/functions/update-platform-business/index.ts` | Add enterprise case to getTierProfileCap |

