

## Align New Project Dialog Filters with Admin Dashboard

### What Changes
Bring the New Project dialog's personnel filtering logic fully in line with the admin dashboard so they behave identically. Currently there are 5 remaining discrepancies after the issuers fix.

### Fixes

**1. Role filter uses wrong field (critical)**
- Currently: `roleFilters.includes(p.category || '')` -- matches "employee"/"freelancer"
- Should be: `roleFilters.includes(p.role)` -- matches actual job role like "Diver", "Welder"

**2. Search should include certificate names**
- Currently: searches name, role, location, email
- Add: `p.certificates.some(c => c.name.toLowerCase().includes(q))`

**3. Certificate types list derived from DB table instead of personnel data**
- Currently: `uniqueCertNames` comes from `certificateTypes.map(t => t.name)` (DB query)
- Should be: derived from `personnel.flatMap(p => p.certificates.map(c => c.name))` like the dashboard
- Remove the `useCertificateTypes` import/hook if no longer needed elsewhere in the dialog

**4. Availability filter has UI but no filtering logic**
- Currently: `availabilityDateRange` state exists and the calendar UI works, but the filter is never applied to the personnel list
- Add: import `usePersonnelAvailability` hook, call it with the personnel IDs and date range, and add `if (availabilityDateRange?.from && !isAvailable(p.id)) return false` to the filter

**5. No sort option**
- Add a `sortOption` state (`'recent'` | `'alphabetical'`, default `'recent'`)
- Add sort logic matching the dashboard (alphabetical by name, or by `updatedAt` descending)
- Add a simple sort toggle in the filter area

### Technical Details

**File: `src/components/AddProjectDialog.tsx`**

1. Line 324: Change `roleFilters.includes(p.category || '')` to `roleFilters.includes(p.role)`

2. Lines 314-319: Add certificate name matching to search:
   ```ts
   p.certificates.some(c => c.name.toLowerCase().includes(q))
   ```

3. Line 357: Change `uniqueCertNames` from:
   ```ts
   [...new Set(certificateTypes.map(t => t.name))]
   ```
   to:
   ```ts
   [...new Set(personnel.flatMap(p => p.certificates.map(c => c.name)).filter(Boolean))].sort()
   ```
   Remove `useCertificateTypes` import and hook call if unused elsewhere.

4. Add availability filtering:
   - Import `usePersonnelAvailability` from `@/hooks/usePersonnelAvailability`
   - Call the hook with personnel IDs
   - Add availability check in `getFilteredPersonnel()` before the return

5. Add sort functionality:
   - Add `sortOption` state
   - Apply sorting in `getSortedPersonnel` or inline after filtering
   - Add a small sort toggle UI (matching dashboard pattern)
   - Reset `sortOption` in `resetForm`

6. Add pre-computed maps for category and issuer filtering (matching dashboard pattern with `useMemo` and `Map<string, Set<string>>`), replacing the inline `.some()` calls -- this ensures identical performance and behavior.

