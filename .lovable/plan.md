

## Fix: Repair Account for wayan.lalet@yahoo.fr

### What Happened

1. The user originally signed up via the freelancer registration flow, which created their auth account, profile, and role
2. Their profile was deleted, then a new personnel record and invitation were created via "Add Personnel"
3. However, the old **auth account still exists** -- it just has no `profiles` or `user_roles` records anymore
4. When they log in, authentication succeeds but the app finds no profile/role, creating a redirect loop back to the login page
5. The pending invitation cannot help because the `handle_new_user` trigger only fires on new account creation, not on login

### Fix (Database Data Repair)

Run three data operations to restore the missing records and link everything together:

**1. Create the missing `profiles` record**
```sql
INSERT INTO profiles (id, email, full_name, business_id)
VALUES (
  'eef8e3c3-e5d9-4b9d-9782-58b5db8a0cd9',
  'wayan.lalet@yahoo.fr',
  'Wayan Lalet',
  '38672512-2331-4546-8bc4-de942605fce1'
);
```

**2. Create the missing `user_roles` record**
```sql
INSERT INTO user_roles (user_id, role)
VALUES ('eef8e3c3-e5d9-4b9d-9782-58b5db8a0cd9', 'worker');
```

**3. Link the personnel record to the auth account and mark the invitation as accepted**
```sql
UPDATE personnel
SET user_id = 'eef8e3c3-e5d9-4b9d-9782-58b5db8a0cd9'
WHERE id = 'adfd4621-6ea4-4eac-9349-1fda978e2599';

UPDATE invitations
SET status = 'accepted'
WHERE id = '8c423909-0863-4bbc-ac7b-994cb9ca7400';
```

### No Code Changes Needed

This is purely a data repair. Once the three records are in place, the user will be able to log in with their existing credentials and land on the worker dashboard normally.

### Preventing This in the Future

When deleting and re-creating a user who already has an auth account, the system should ideally detect the existing auth.users record and re-link it rather than creating a new invitation. This would be a future improvement to the "Add Personnel" or invitation flow.

