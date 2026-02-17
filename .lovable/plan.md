

# Fix Slow Login-to-Dashboard Loading

## Problem
After login, the dashboard takes too long to appear because of sequential data-fetching waterfalls and a combined loading gate that blocks all content until the slowest query chain finishes.

## Root Causes
1. `usePersonnel` fetches personnel, waits, then fetches certificates (waterfall)
2. `useProjects` fetches projects, waits, then fetches calendar items (waterfall)
3. Dashboard loading state = `personnelLoading || projectsLoading` -- blocks everything until both finish
4. Admin user IDs fetch adds an artificial 100ms delay before starting
5. Six hooks all start independent fetches on mount, competing for connection bandwidth

## Solution (3 changes)

### 1. Parallelize inner queries in `usePersonnel` and `useProjects`

**`src/hooks/usePersonnel.ts`**: Instead of fetching personnel first, then certificates, fire both queries in parallel using `Promise.all`. Match certificates to personnel client-side (already done, just needs parallel fetch).

**`src/hooks/useProjects.ts`**: Same treatment -- fetch projects and calendar items in parallel.

### 2. Remove artificial 100ms delay for admin user IDs

**`src/pages/AdminDashboard.tsx`**: Remove the `deferredReady` state and the `setTimeout(() => setDeferredReady(true), 100)` pattern. Instead, fetch admin user IDs immediately when `profile.business_id` is available. This eliminates a wasted 100ms.

### 3. Show dashboard shell immediately with per-section skeletons

**`src/pages/AdminDashboard.tsx`**: The dashboard already has a comment saying "No full-screen spinner - we render the shell immediately" (line 306), but `loading` is still used to gate content in certain areas. Ensure the dashboard header, tabs, and business info render instantly while only individual content sections show skeleton loading states.

## Technical Details

**usePersonnel.ts -- parallelize:**
```typescript
// Before (waterfall):
const { data: personnelData } = await supabase.from('personnel').select('*');
const personnelIds = personnelData.map(p => p.id);
const { data: certificatesData } = await supabase.from('certificates')...in('personnel_id', personnelIds);

// After (parallel):
const [personnelResult, certificatesResult] = await Promise.all([
  supabase.from('personnel').select('*'),
  supabase.from('certificates').select('*, certificate_categories(name), certificate_types(name)')
]);
// Filter certificates client-side by personnel IDs
```

**useProjects.ts -- parallelize:**
```typescript
// Before (waterfall):
const { data: projectsData } = await supabase.from('projects').select('*');
const projectIds = projectsData.map(p => p.id);
const { data: calendarItems } = await supabase.from('project_calendar_items')...in('project_id', projectIds);

// After (parallel):
const [projectsResult, calendarResult] = await Promise.all([
  supabase.from('projects').select('*').order('created_at', { ascending: false }),
  supabase.from('project_calendar_items').select('*')
]);
// Filter calendar items client-side by project IDs
```

**AdminDashboard.tsx -- remove 100ms delay:**
```typescript
// Remove the deferredReady state and setTimeout
// Change dependency from deferredReady to just profile?.business_id
useEffect(() => {
  if (!profile?.business_id) return;
  const fetchAdminUserIds = async () => { ... };
  fetchAdminUserIds();
}, [profile?.business_id]);
```

## Expected Impact
- Eliminates ~200-400ms from personnel loading (no more sequential certificate fetch)
- Eliminates ~100-200ms from projects loading (no more sequential calendar fetch)
- Removes 100ms artificial delay for admin IDs
- Total improvement: approximately 400-700ms faster dashboard load after login

## What Does NOT Change
- AuthContext flow (already optimized)
- RLS policies and security model
- Data correctness (same data fetched, just in parallel)
- Component rendering logic
- Realtime subscriptions

