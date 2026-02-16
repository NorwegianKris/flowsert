

## Add "Issuers" as a Third Toggle in the Certificate Filter Dropdown

### Overview
Add "Issuers" as a third toggle option inside the certificate filter dropdown on the personnel filter bar (alongside "Types" and "Categories"). When selected, it shows a list of distinct issuing authorities from the business's certificates. Filtering works identically to types/categories -- personnel must have ALL selected issuers to be shown.

### Changes

**1. `src/components/PersonnelFilters.tsx`**
- Update the `CertificateFilterMode` type to include `'issuers'`: `'types' | 'categories' | 'issuers'`
- Add a new prop `certificateIssuers` (string array) for the list of distinct issuing authorities
- Update the `certificateListItems` logic to handle the third mode: when `'issuers'`, use the `certificateIssuers` list
- Add a third `ToggleGroupItem` with value `"issuers"` and a suitable icon (e.g., `Building2` which is already imported) in the toggle group
- Update the empty-state text to include "issuers" when in that mode
- Show the toggle group when any of the three lists have items (adjust the condition to also check `certificateIssuers.length > 0`)

**2. `src/pages/AdminDashboard.tsx`**
- Compute `uniqueIssuers` via a `useMemo` that collects distinct `issuingAuthority` values from all personnel certificates, sorted alphabetically
- Build a `personnelIssuersMap` (similar to `personnelCertificateCategoriesMap`) that maps each personnel ID to a Set of their issuing authorities
- Pass the new `certificateIssuers` prop to `PersonnelFilters`
- Update the `filteredPersonnel` logic to add a third branch: when `certificateFilterMode === 'issuers'`, check that the personnel has certificates from ALL selected issuers (using `.every()`, same as types and categories)

### No Database Changes
The `issuing_authority` field already exists on the `certificates` table and is already fetched in the `usePersonnel` hook. No migrations needed.

### Technical Details

New computed values in AdminDashboard:
```typescript
const uniqueIssuers = useMemo(() => {
  const issuers = new Set<string>();
  personnel.forEach(p => {
    p.certificates.forEach(c => {
      if (c.issuingAuthority) issuers.add(c.issuingAuthority);
    });
  });
  return [...issuers].sort();
}, [personnel]);

const personnelIssuersMap = useMemo(() => {
  const map = new Map<string, Set<string>>();
  personnel.forEach(p => {
    const issuers = new Set<string>();
    p.certificates.forEach(c => {
      if (c.issuingAuthority) issuers.add(c.issuingAuthority);
    });
    map.set(p.id, issuers);
  });
  return map;
}, [personnel]);
```

Filter logic addition (inside `filteredPersonnel`):
```typescript
} else if (certificateFilterMode === 'issuers') {
  const personnelIssuers = personnelIssuersMap.get(p.id) || new Set<string>();
  const hasAllIssuers = certificateFilters.every(issuer => personnelIssuers.has(issuer));
  if (!hasAllIssuers) return false;
}
```
