

## Add Compliance Status Filter

Cosmetic + filtering logic. No schema/RLS changes. 🟢

### Changes

**`src/components/PersonnelFilters.tsx`**
1. Add `complianceStatusFilter` and `onComplianceStatusFilterChange` props (type: `'all' | 'valid' | 'expiring' | 'expired'`).
2. Add a `[complianceOpen, setComplianceOpen]` state and a new outline-style dropdown after the Department filter (before the Sort button).
3. Use a `ShieldCheck` (or similar) icon. Options: All (default), Valid, Expiring Soon, Expired — rendered as simple radio-style buttons (like the Sort popover).
4. Include compliance status in `hasActiveFilters` and `clearAllFilters`.
5. Show a badge when active (not "all").

**`src/pages/AdminDashboard.tsx`**
1. Add `complianceStatusFilter` state defaulting to `'all'`.
2. Pass it and its setter to `PersonnelFilters`.
3. In the personnel filtering pipeline, apply `getPersonnelOverallStatus(p)` (already imported from `@/lib/certificateUtils`) and compare against the selected filter value. Map `'expiring'` filter to the `'expiring'` status return value.

### Files
- `src/components/PersonnelFilters.tsx`
- `src/pages/AdminDashboard.tsx`

