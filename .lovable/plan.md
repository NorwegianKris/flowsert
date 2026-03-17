

## Plan: Platform Admin Dashboard for hello@flowsert.com

### Route path: `/platform`

Per user feedback, the route will be `/platform` (not `/superadmin`) to match the component naming.

### Visual style

PlatformDashboard will match the existing admin dashboard: navy `#1E1B4B` and indigo `#3B3AC2` palette, same card styles (`rounded-xl border bg-card shadow-sm`), Inter font stack, consistent spacing. It will feel like a natural part of FlowSert, not a separate tool.

### Changes

#### 1. Database Migration

Update `handle_new_user` to add a platform admin bypass at the top:
- If email is `hello@flowsert.com`, insert profile with `business_id = NULL`, insert `user_roles` row with `admin` role, return early (no invitation required)

Update `is_superadmin` to include `hello@flowsert.com` in the email check.

#### 2. AuthContext (`src/contexts/AuthContext.tsx`)

- Update `isSuperadmin` to match both `kmu@live.no` and `hello@flowsert.com`
- Add `isPlatformAdmin: boolean` (true only for `hello@flowsert.com`)
- Export in context type and value

#### 3. RoleRedirect (`src/pages/RoleRedirect.tsx`)

- Add platform admin check as the **first condition** before any role check:
  ```
  if (profile?.email === 'hello@flowsert.com') {
    navigate('/platform', { replace: true });
    return;
  }
  ```

#### 4. New: PlatformAdminRoute (`src/components/PlatformAdminRoute.tsx`)

- Reads `profile` and `loading` from AuthContext
- If loading: spinner
- If `profile?.email !== 'hello@flowsert.com'`: redirect to `/auth`
- Otherwise: render children

#### 5. New: PlatformDashboard (`src/pages/PlatformDashboard.tsx`)

Standalone page matching FlowSert admin visual style:
- Background pattern (same `dashboard-bg-pattern.png`)
- FlowSert logo + "FlowSert Platform" heading in navy
- Single card: "Businesses — coming soon" with Building2 icon
- Sign out button in top-right
- No shared admin components, no sidebar, no tabs

#### 6. App.tsx

- Import PlatformAdminRoute and PlatformDashboard
- Add route: `<Route path="/platform" element={<PlatformAdminRoute><PlatformDashboard /></PlatformAdminRoute>} />`

### Files

| File | Change |
|------|--------|
| SQL migration | Update `handle_new_user` + `is_superadmin` |
| `src/contexts/AuthContext.tsx` | Add `isPlatformAdmin`, update `isSuperadmin` |
| `src/pages/RoleRedirect.tsx` | Platform admin redirect first |
| `src/components/PlatformAdminRoute.tsx` | New route guard |
| `src/pages/PlatformDashboard.tsx` | New standalone page |
| `src/App.tsx` | Add `/platform` route |

