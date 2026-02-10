
# Login Performance Investigation - Findings and Fixes

## Root Cause Analysis

The slow login is caused by a **waterfall of sequential operations** and **duplicate database queries**. Here is what happens step-by-step after a user enters their credentials:

### The Waterfall Problem

```text
Step 1: Auth sign-in (Supabase auth)               ~100-200ms
Step 2: AuthContext fetches profile + role           ~200-400ms  (waits for Step 1)
Step 3: RoleRedirect navigates to /admin or /worker  ~50ms      (waits for Step 2)
Step 4: Dashboard mounts and fires many queries      ~500-1500ms (waits for Step 3)
         Total perceived login time:                 ~1-3 seconds
```

Each step must fully complete before the next one starts. The user sees a spinner throughout all of this.

### Specific Issues Found

1. **Duplicate `businesses` table query (Worker Dashboard)**
   - `useBusinessInfo` fetches the full business record
   - `useDataAcknowledgement` fetches `required_ack_version` from the **same** `businesses` table in a separate query
   - This is an unnecessary extra round-trip

2. **Sequential queries in `useDataAcknowledgement`**
   - First queries `businesses` for the version, then queries `data_processing_acknowledgements`
   - These could be parallelized or the version could be passed from `useBusinessInfo`

3. **Admin Dashboard fires 7+ simultaneous queries on mount**
   - All personnel + all certificates
   - All projects + calendar items
   - Business info
   - Unread direct messages
   - Certificate categories
   - Admin user IDs (2 queries)
   - While parallelized, this many simultaneous connections can be slow

4. **`usePersonnel` fetches ALL certificates separately**
   - First fetches all personnel, then fetches all certificates in a second query
   - These are sequential, not parallel

## Proposed Fixes

### Fix 1: Eliminate duplicate business query in worker flow
Pass the `required_ack_version` from the already-fetched business record into `useDataAcknowledgement` instead of fetching it again.

| File | Change |
|------|--------|
| `src/hooks/useDataAcknowledgement.ts` | Accept `requiredVersion` as a parameter instead of fetching from `businesses` table |
| `src/pages/WorkerDashboard.tsx` | Pass `business?.required_ack_version` to `useDataAcknowledgement` |

### Fix 2: Parallelize acknowledgement check
Once the duplicate query is removed, the acknowledgement lookup becomes a single query instead of two sequential ones, cutting the wait time in half.

### Fix 3: Defer non-critical admin dashboard queries
Delay loading of admin user IDs, unread message counts, and availability data until after the main personnel list is displayed. This lets the UI render faster.

| File | Change |
|------|--------|
| `src/pages/AdminDashboard.tsx` | Defer `fetchAdminUserIds` and non-critical hooks using a `useEffect` with a small delay or lazy loading pattern |

### Fix 4: Show dashboard shell immediately
Instead of showing a full-screen spinner while data loads, render the dashboard layout (header, tabs, skeleton cards) immediately so users see progress.

| File | Change |
|------|--------|
| `src/pages/AdminDashboard.tsx` | Replace full-screen loader with skeleton UI for the content area |
| `src/pages/WorkerDashboard.tsx` | Same approach - show header immediately, skeleton for profile content |

## Summary of File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/hooks/useDataAcknowledgement.ts` | Modify | Accept version as parameter, remove duplicate businesses query |
| `src/pages/WorkerDashboard.tsx` | Modify | Pass business version to hook, show header immediately with skeleton loading |
| `src/pages/AdminDashboard.tsx` | Modify | Show dashboard shell with skeletons instead of full-screen spinner, defer non-critical queries |

## Expected Impact
- Worker login: ~30-40% faster (eliminating 1-2 redundant queries)
- Admin login: Perceived as faster due to skeleton UI appearing immediately, even if total data load time is similar
- Both: Reduced database connection pressure from fewer simultaneous queries
