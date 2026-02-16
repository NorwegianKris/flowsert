

## "My Profile" Button in Admin Header

### Overview
Add a "My Profile" button to the sticky top header (DashboardHeader), positioned just left of the "Report improvement or issue" button. It checks if the logged-in admin has a linked personnel record and either navigates to their profile or shows a linking dialog.

### Risk Assessment
This is a low-risk, straightforward change:
- No database migrations needed
- No new API calls -- reuses already-loaded personnel data
- Reuses existing `PersonnelDetail` component
- Simple conditional logic with a single `useMemo`

### Changes

**1. `src/components/DashboardHeader.tsx`**
- Accept new props: `onMyProfileClick` callback and `hasLinkedProfile` boolean (to show a subtle indicator)
- Add a "My Profile" button with a `User` icon, placed immediately left of the `ReportFeedbackDialog`

**2. `src/pages/AdminDashboard.tsx`**
- Add a `useMemo` to find the admin's own personnel record: `personnel.find(p => p.userId === user?.id)`
- Pass `onMyProfileClick` handler to `DashboardHeader`:
  - If linked: sets `selectedPersonnel` to their own record (reusing the existing detail view)
  - If not linked: opens a new `LinkProfileDialog`

**3. New: `src/components/LinkProfileDialog.tsx`**
- A dialog shown when an unlinked admin clicks "My Profile"
- Explains the benefit of linking ("Manage your own certificates, set expiry alerts, track your documents")
- Two options:
  - **Link existing**: Auto-detects a personnel record matching the admin's email (with `user_id` null). One-click to link by updating `user_id`
  - **Create new**: Opens the existing `AddPersonnelDialog` pre-filled with the admin's name and email
- A "Not now" dismiss button

### Technical Details

The `DashboardHeader` currently only contains `Logo` and `ReportFeedbackDialog`. The new button slots in between them:

```text
[ Logo ]                    [ My Profile ] [ Report Improvement ]
```

The lookup logic is a simple derived value from existing state:

```text
const myProfile = useMemo(() =>
  personnel.find(p => p.userId === user?.id),
  [personnel, user?.id]
);
```

No new hooks, no new database queries, no new RLS policies needed. The `LinkProfileDialog` performs a single `supabase.from('personnel').update({ user_id })` call which is already covered by the existing admin UPDATE RLS policy.
