
# Plan: Show Only Merged Type Names in Certificate Filter Dropdown

## Problem

The certificate filter dropdown on the admin dashboard currently displays raw certificate names like:
- `3.2 CSWIP Inspection`
- `3.2U`
- `3.2U Inspection`
- `3.2u`
- `3.2u inspection`

Even after merging these into the official "CSWIP 3.2U Inspector" type, the variations still appear because:
1. The filter pulls from `certificates.name` (the original uploaded name)
2. Merging only updates `certificate_type_id`, not the `name` field
3. The original names are preserved for historical reference

## Solution

Update the system to use **canonical type names** for filtering instead of raw certificate names. When a certificate has been mapped to an official type, use that type's name. Only show the raw name for unmapped certificates.

### Current Flow
```
Certificate Record → name: "3.2u inspection" → Appears in dropdown as "3.2u inspection"
```

### New Flow
```
Certificate Record → certificate_type_id → lookup certificate_types.name → Appears as "CSWIP 3.2U Inspector"
```

## Technical Changes

### File 1: `src/hooks/usePersonnel.ts`

Update the certificate query to join with `certificate_types` and include the canonical type name:

```typescript
// Line ~78-80: Update the certificates query
const { data, error: certError } = await supabase
  .from('certificates')
  .select(`
    *, 
    certificate_categories(name),
    certificate_types(name)
  `)
  .in('personnel_id', personnelIds);
```

Update the mapping to include the type name (lines ~120-129):

```typescript
.map((c: DbCertificate): Certificate => ({
  id: c.id,
  // Use canonical type name if mapped, otherwise fall back to raw name
  name: c.certificate_types?.name || c.name,
  dateOfIssue: c.date_of_issue,
  expiryDate: c.expiry_date,
  placeOfIssue: c.place_of_issue,
  issuingAuthority: c.issuing_authority || undefined,
  documentUrl: c.document_url || undefined,
  category: c.certificate_categories?.name || undefined,
  certificateTypeId: c.certificate_type_id || undefined,
}))
```

### File 2: `src/types/index.ts`

Ensure the `Certificate` interface has the necessary fields (already has `certificateTypeId`, just confirming).

### File 3: Update DbCertificate interface

Add the certificate_types join result to the interface:

```typescript
interface DbCertificate {
  // ... existing fields ...
  certificate_type_id: string | null;
  certificate_types: { name: string } | null;
}
```

## Result After Implementation

Before:
```
Dropdown shows:
- 3.2 CSWIP Inspection
- 3.2U
- 3.2U Inspection  
- 3.2u
- 3.2u inspection
- CSWIP 3.2U Inspector  ← (if any cert was created with this exact name)
```

After:
```
Dropdown shows:
- CSWIP 3.2U Inspector  ← (consolidated, all mapped variations)
- BOSIET                ← (unmapped, shows raw name)
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/usePersonnel.ts` | Join certificate_types, use type name for Certificate.name when mapped |
| Same file | Update DbCertificate interface to include certificate_types |

## Impact

1. **Admin Dashboard Filter**: Will show only official type names for mapped certificates
2. **Personnel Search**: Will search by canonical type names
3. **Certificate Lists**: Will display the official type name throughout the UI
4. **Historical Data**: Original names are preserved in `title_raw` for reference but not displayed in filters
5. **Backward Compatibility**: Unmapped certificates still show their original name

## Workflow

After this change:
1. Merge all CSWIP variations in Settings → Certificates → Types
2. Refresh the admin dashboard
3. The filter will now show only "CSWIP 3.2U Inspector" instead of 5 variations
