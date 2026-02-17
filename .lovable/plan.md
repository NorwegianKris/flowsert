

## Complete User Deletion: Final Approved Implementation

### Step 1: Immediate SQL Cleanup

Run three statements to unblock **wayan.lalet@yahoo.fr**:

```sql
UPDATE personnel SET user_id = NULL WHERE user_id = 'eef8e3c3-e5d9-4b9d-9782-58b5db8a0cd9';
DELETE FROM user_roles WHERE user_id = 'eef8e3c3-e5d9-4b9d-9782-58b5db8a0cd9';
DELETE FROM profiles WHERE id = 'eef8e3c3-e5d9-4b9d-9782-58b5db8a0cd9';
```

---

### Step 2: Add SUPERADMIN_EMAIL Secret

Store `kmu@live.no` as the `SUPERADMIN_EMAIL` environment variable.

---

### Step 3: Create `delete-user` Edge Function

**File:** `supabase/functions/delete-user/index.ts`

**Config:** `verify_jwt = false` (signing-keys system, consistent with all other functions)

**Normalized superadmin constant at top of handler:**
```typescript
const SUPER = (Deno.env.get("SUPERADMIN_EMAIL") ?? "").toLowerCase().trim();
if (!SUPER) return 500: "Server misconfiguration"
```
All email comparisons use `email.toLowerCase().trim() === SUPER`.

**Two-client pattern:**
1. User-bound client (anon key) -- identity verification only via `getClaims(token)`
2. Service-role client -- all DB reads and privileged mutations

**Authorization sequence:**

1. Extract Bearer token. Missing -> **401**.
2. `getClaims(token)` on anon client. Invalid -> **401**. Extract `caller_id` from `claims.sub`.
3. Fail closed: if `SUPERADMIN_EMAIL` env var missing/empty -> **500**.
4. Self-deletion block: `caller_id === target_id` -> **400**.
5. Caller role check (first authz gate): service-role query `user_roles`. Not admin -> **403**.
6. Caller email check (second authz gate): service-role query `profiles`. Not matching SUPER -> **403**.

**Safety checks:**

7. Target exists in auth: `auth.admin.getUserById(target_id)`. Not found -> **404**.
8. **Auth-level superadmin protection**: if `authUser.user.email.toLowerCase().trim() === SUPER` -> **403**. Catches orphaned/corrupted profile states.
9. **Profile-level superadmin protection** (secondary): query `profiles WHERE id = target_id`. If email matches SUPER -> **403**. If profile missing, skip (auth-level check already handled it).

**Deletion sequence (all via service-role client):**

10. `UPDATE personnel SET user_id = NULL WHERE user_id = target_id`
11. `DELETE FROM user_roles WHERE user_id = target_id`
12. `DELETE FROM profiles WHERE id = target_id` (tolerates "not found")
13. `auth.admin.deleteUser(target_id)` -- if fails, return error, log partial state

---

### Step 4: Update AdminOverview UI

**File:** `src/components/AdminOverview.tsx`

- Trash icon button on each admin row
- Only visible when `isSuperadmin` (from AuthContext)
- Hidden on superadmin's own row (`admin.id === profile.id`)
- AlertDialog confirmation: "This will permanently remove this admin user from authentication and unlink all associated records. This cannot be undone."
- On confirm: `supabase.functions.invoke('delete-user', { body: { user_id } })`
- Success: toast + refresh admin list
- Error: error toast with message

---

### Technical Summary

| Concern | Solution |
|---|---|
| JWT validation | `getClaims()` on anon-key client (verifies sig, exp, aud, iss) |
| Client separation | Anon-key for identity; service-role for reads + mutations |
| Email normalization | `SUPER` constant: `.toLowerCase().trim()` once at top |
| Missing env var | 500 -- fail closed |
| Authz gate 1 | Caller role must be `admin` (checked first) |
| Authz gate 2 | Caller email must match SUPER (checked second) |
| Self-deletion | Hard block (400) |
| Superadmin target (auth-level) | Auth user email matches SUPER -- deny (403) even if profile missing |
| Superadmin target (profile-level) | Profile email matches SUPER -- deny (403), secondary layer |
| Target validation | `auth.admin.getUserById()` -- 404 if not in auth |
| Deletion order | personnel unlink, user_roles, profiles, auth.admin.deleteUser |
| Failure mode | If auth delete fails, return error, log partial state |

**Files:**
- Create: `supabase/functions/delete-user/index.ts`
- Modify: `src/components/AdminOverview.tsx`, `supabase/config.toml`
- Secret: `SUPERADMIN_EMAIL`

