

## Plan: Fix admin_email in list-platform-businesses

### Problem
The function queries `invitations` table to find admin emails. This is unreliable — invitations may not exist for the original owner (e.g. Techno Dive's owner `kmu@live.no` was set up via the superadmin flow, not an invitation).

### Fix: `supabase/functions/list-platform-businesses/index.ts`

Replace lines 84-110 (the invitations query + adminEmailMap building) with a query that joins `profiles` and `user_roles`:

1. Query `profiles` joined with `user_roles` where `role = 'admin'`, filtered to the business IDs, ordered by `profiles.created_at ASC`
2. Build the `adminEmailMap` by taking the first admin profile per business (the original owner)

**Query replacement:**
```typescript
// Fetch first admin profile per business (original owner)
const { data: adminProfiles } = await adminClient
  .from("profiles")
  .select("business_id, email")
  .in("business_id", businessIds)
  .order("created_at", { ascending: true });

// Filter to only admin-role users
const { data: adminRoles } = await adminClient
  .from("user_roles")
  .select("user_id")
  .eq("role", "admin");

const adminUserIds = new Set((adminRoles || []).map((r) => r.user_id));
```

Wait — `profiles` doesn't have `user_id`, it uses `id` as the user ID. And we can't join across tables easily with the JS client without a DB view. Simpler approach:

1. Fetch all `user_roles` where `role = 'admin'` → get set of admin user IDs
2. Fetch `profiles` where `id` is in that set AND `business_id` is in businessIds, ordered by `created_at ASC`
3. Build map: first match per `business_id` wins

```typescript
const { data: adminRoles } = await adminClient
  .from("user_roles")
  .select("user_id")
  .eq("role", "admin");

const adminUserIds = (adminRoles || []).map((r: any) => r.user_id);

const { data: adminProfiles } = await adminClient
  .from("profiles")
  .select("id, business_id, email, created_at")
  .in("id", adminUserIds)
  .in("business_id", businessIds)
  .order("created_at", { ascending: true });

const adminEmailMap: Record<string, string> = {};
for (const p of adminProfiles || []) {
  if (p.business_id && !adminEmailMap[p.business_id]) {
    adminEmailMap[p.business_id] = p.email;
  }
}
```

This ensures Techno Dive shows `kmu@live.no` (earliest admin profile) instead of whatever was in the invitations table.

| File | Change |
|------|--------|
| `supabase/functions/list-platform-businesses/index.ts` | Replace invitations query (lines 84-110) with profiles + user_roles lookup |

