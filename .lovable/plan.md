

# Admin-Personnel Profile Linking Management

## Overview

This feature will create an enhanced Admin Users management interface that shows the linking status between admin user accounts and their personnel profiles, allowing superadmins to identify and resolve disconnected accounts.

## The Problem

Currently, admin users and personnel profiles can become disconnected in several ways:
1. An admin user exists (in `profiles` + `user_roles`) but has no linked personnel record
2. A personnel profile exists with an admin's email but the `user_id` is not linked
3. The personnel record exists and is linked, but the role in `user_roles` might not match

## Solution

Enhance the **AdminOverview** component to show:
- Which admins have linked personnel profiles
- Which admins are missing personnel profiles
- Quick actions to link or create missing profiles

---

## User Experience

### Enhanced Admin Users Card

Each admin row will display:
- Current info (avatar, name, email, badges)
- **New**: A status indicator showing personnel profile link status
  - Green checkmark: "Profile Linked" - admin has a connected personnel record
  - Orange warning: "No Personnel Profile" - admin exists but has no personnel record
- **New**: Action button for unlinked admins:
  - "Link Profile" - if a personnel record with matching email exists but isn't linked
  - "Create Profile" - if no personnel record exists for this admin

### Visual Example

```text
┌─────────────────────────────────────────────────────────────┐
│ Admin Users                                           [+ 5] │
├─────────────────────────────────────────────────────────────┤
│ [KU] Kristian Utseth                                        │
│     kmu@live.no                                             │
│     [Superadmin] [Admin] [✓ Profile Linked]                 │
├─────────────────────────────────────────────────────────────┤
│ [HB] Heidi Benedikte Nordtveit                              │
│     hbn@techno-dive.no                                      │
│     [Admin] [✓ Profile Linked]                              │
├─────────────────────────────────────────────────────────────┤
│ [TM] Thor Erik Madsen                                       │
│     tm@techno-dive.no                                       │
│     [Admin] [⚠ No Profile]           [Link Profile]         │
└─────────────────────────────────────────────────────────────┘
```

---

## Technical Implementation

### 1. Enhance AdminOverview Component

**File**: `src/components/AdminOverview.tsx`

**Changes**:
- Extend the `AdminUser` interface to include personnel linking info:
  ```typescript
  interface AdminUser {
    id: string;           // user ID from profiles
    email: string;
    fullName: string | null;
    personnelId: string | null;      // linked personnel record ID
    personnelName: string | null;    // name from personnel record
    hasUnlinkedProfile: boolean;     // personnel exists but user_id is null
  }
  ```

- Update the fetch logic to:
  1. Get all admin user IDs from `user_roles`
  2. Get their profiles from `profiles` table
  3. Check `personnel` table for matching records (by `user_id` or `email`)
  4. Determine linking status for each admin

- Add visual status indicators:
  - Linked: Green badge with checkmark "Profile Linked"
  - Unlinked but exists: Orange badge "Unlinked" with "Link Profile" button
  - No profile: Muted text "No personnel profile" with "Create Profile" button

### 2. Create Link Personnel Action

**New Function in AdminOverview**:
- `handleLinkPersonnel(adminUserId, personnelId)`: Updates the personnel record to set `user_id`
- Uses direct Supabase update (admins have UPDATE permission on personnel in their business)

### 3. Create Personnel Profile for Admin

**New Function in AdminOverview**:
- `handleCreatePersonnelProfile(admin)`: Creates a new personnel record with the admin's info
- Pre-fills: name, email, business_id, user_id
- Sets reasonable defaults for required fields (role, location, phone)

### 4. Database Query Logic

```typescript
// Pseudocode for the enhanced fetch
const fetchAdminsWithLinkStatus = async () => {
  // 1. Get admin user IDs
  const adminRoles = await supabase
    .from('user_roles')
    .select('user_id')
    .eq('role', 'admin');

  // 2. Get profiles for these admins
  const profiles = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .in('id', adminRoles.map(r => r.user_id))
    .eq('business_id', businessId);

  // 3. Get personnel records (linked by user_id OR matching by email)
  const personnel = await supabase
    .from('personnel')
    .select('id, name, email, user_id')
    .eq('business_id', businessId);

  // 4. Map and determine status for each admin
  return profiles.map(profile => {
    const linkedPersonnel = personnel.find(p => p.user_id === profile.id);
    const matchingPersonnel = personnel.find(p => 
      p.email.toLowerCase() === profile.email.toLowerCase() && !p.user_id
    );
    
    return {
      ...profile,
      personnelId: linkedPersonnel?.id || null,
      personnelName: linkedPersonnel?.name || null,
      hasUnlinkedProfile: !!matchingPersonnel,
      unlinkedPersonnelId: matchingPersonnel?.id || null,
    };
  });
};
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/AdminOverview.tsx` | Enhance to show link status, add action buttons |

## Files to Create

None - all functionality fits within the existing AdminOverview component.

---

## Security Considerations

- Only superadmin (`kmu@live.no`) can see and use the link/create actions
- Regular admins see the status but cannot modify
- All operations use existing RLS policies (admins can update personnel in their business)

---

## Edge Cases Handled

1. **Multiple personnel with same email**: Shows the first unlinked match
2. **Admin creates profile, logs out, someone creates personnel manually**: The "Link Profile" action resolves this
3. **Personnel exists with different email than admin**: Won't auto-detect, but admin can manually edit personnel email

