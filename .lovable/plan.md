

## "My Companies" -- Final Implementation Plan

### Overview
Add a "My Companies" section to the worker dashboard showing all businesses a worker belongs to (via personnel records). Each company is a clickable mini-card that opens the existing read-only CompanyCard in a dialog.

### What You'll See
- The dashboard header area becomes a unified grid with this exact order:
  - **Left:** My Companies
  - **Middle:** Project Invitations
  - **Right:** Posted Projects
- Each company shown as a compact card with logo and truncated name
- Clicking opens a dialog with full read-only company details and shared documents
- Max 4 visible; "+X more" button if overflow, opening a full list dialog
- Hidden entirely if worker belongs to zero companies
- Freelancers: My Companies (left) + Posted Projects (right), no invitations
- On mobile: stacked vertically in the same order (top to bottom)

---

### Technical Steps

**Step 1: Database Migration -- RLS Policies + Indexes**

Idempotent migration with DROP IF EXISTS before CREATE. Both policies include the safety clause `AND p.user_id IS NOT NULL` to prevent unlinked personnel records from granting access.

```sql
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workers can view businesses they belong to" ON public.businesses;
CREATE POLICY "Workers can view businesses they belong to"
ON public.businesses FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.personnel p
    WHERE p.business_id = businesses.id
    AND p.user_id = auth.uid()
    AND p.user_id IS NOT NULL
  )
);

DROP POLICY IF EXISTS "Workers can view documents for their businesses" ON public.business_documents;
CREATE POLICY "Workers can view documents for their businesses"
ON public.business_documents FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.personnel p
    WHERE p.business_id = business_documents.business_id
    AND p.user_id = auth.uid()
    AND p.user_id IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_personnel_user_id ON public.personnel(user_id);
CREATE INDEX IF NOT EXISTS idx_personnel_business_user ON public.personnel(business_id, user_id);
```

No existing policies are modified or removed. No OR conditions. Access strictly via `EXISTS (personnel ... user_id = auth.uid() AND user_id IS NOT NULL)`.

**Step 2: New Hook -- `src/hooks/useWorkerBusinesses.ts`**

- Queries `personnel` for all records where `user_id` matches the current authenticated user
- Extracts unique `business_id` values client-side
- Fetches business details from `businesses` using `.in('id', businessIds)` -- RLS enforces access
- Returns `{ businesses, loading }`
- No service-role, no RPC

**Step 3: Modify `src/components/CompanyCard.tsx`**

- Add optional `businessId` prop to `CompanyCardProps`
- When provided, use it instead of the default business ID from auth context for fetching business info and documents
- No changes to admin edit logic or existing behavior
- Documents fetched via RLS-protected `business_documents` rows first, then signed URLs generated for those specific storage paths. No public bucket access.

**Step 4: New Component -- `src/components/MyCompanies.tsx`**

- Uses `useWorkerBusinesses` hook
- Renders as a Card with consistent padding and min-height matching WorkerInvitations and PostedProjects
- Mini-cards: Avatar (logo) + truncated company name
- First 4 visible; "+X more" badge opens dialog listing all
- Clicking any company opens Dialog with `<CompanyCard businessId={id} />`
- Returns `null` if zero businesses
- Skeleton loader while loading

**Step 5: Update `src/pages/WorkerDashboard.tsx`**

- Replace the current conditional 2-col / single-col layout with a unified grid
- Column order (left to right): **MyCompanies | WorkerInvitations | PostedProjects**
- Non-freelancers: `grid grid-cols-1 lg:grid-cols-3 gap-6` with all three columns
- Freelancers: `grid grid-cols-1 lg:grid-cols-2 gap-6` with MyCompanies and PostedProjects (WorkerInvitations omitted)
- Implemented by conditionally rendering the middle column, not two separate layout branches

### Security Summary

- Access strictly via `EXISTS (personnel ... user_id = auth.uid() AND user_id IS NOT NULL)` -- no OR conditions, no role shortcuts
- The `user_id IS NOT NULL` clause prevents unlinked personnel records from ever matching
- No service-role key usage anywhere
- Existing admin policies remain untouched
- Business documents fetched via RLS-protected rows first, then signed URLs for storage paths
- Business documents bucket is already private
- Migration is idempotent (DROP IF EXISTS before CREATE)
- Performance indexes on `personnel(user_id)` and `personnel(business_id, user_id)` prevent slow RLS checks at scale

