

# Plan: Replace Actions Column with Type Column in CertificateTable

## Summary

Replace the "Actions" column (edit button on far right) with a new "Type" column that displays the certificate type using a tag/badge style similar to the Category column. The Type column will be positioned between Category and Issuing Authority.

## Current State

The table currently has these columns in order:
1. Certificate
2. Status
3. Category (with tag styling)
4. Issuing Authority
5. Date of Issue
6. Expiry Date
7. Place of Issue
8. Document
9. **Actions** (edit button - to be removed)

## Proposed Changes

**File: `src/components/CertificateTable.tsx`**

### 1. Update Table Header

Change column order and replace Actions with Type:

| Before | After |
|--------|-------|
| Certificate | Certificate |
| Status | Status |
| Category | Category |
| Issuing Authority | **Type** (NEW) |
| Date of Issue | Issuing Authority |
| Expiry Date | Date of Issue |
| Place of Issue | Expiry Date |
| Document | Place of Issue |
| Actions | Document |

### 2. Remove Actions Column

- Remove `<TableHead className="font-semibold w-16">Actions</TableHead>` from header
- Remove the Actions `<TableCell>` containing the edit button from each row
- Keep `handleEditClick` function as it's still used in the detail dialog

### 3. Add Type Column

Add new Type column after Category, using similar tag styling:

```tsx
<TableCell>
  {cert.titleRaw ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium">
      <Award className="h-3 w-3" />
      {cert.titleRaw}
    </span>
  ) : (
    <span className="text-xs text-muted-foreground italic">Untyped</span>
  )}
</TableCell>
```

The Type column will use a different color scheme (blue tones) from Category (primary/purple tones) for visual distinction.

### 4. Clean Up Unused Import

Remove `Pencil` from imports if it's no longer used in the table rows (but keep if used in dialog).

## Visual Result

```text
┌─────────────┬────────┬──────────┬────────────────┬──────────────────┬─────────────┬─────────────┬───────────────┬──────────┐
│ Certificate │ Status │ Category │ Type           │ Issuing Authority│ Date Issue  │ Expiry Date │ Place Issue   │ Document │
├─────────────┼────────┼──────────┼────────────────┼──────────────────┼─────────────┼─────────────┼───────────────┼──────────┤
│ ▢ doc.pdf   │ Valid  │ 🏷 Diving │ 🎖 CSWIP 3.2U  │ TWI              │ 01 Jan 2024 │ 01 Jan 2026 │ London        │ 📎 Attached│
│ ▢ cert.pdf  │ Expiring│ 🏷 Medical│ 🎖 Diver Medical│ IMCA            │ 15 Mar 2023 │ 15 Mar 2025 │ Aberdeen      │ 📎 Attached│
│ ▢ test.pdf  │ Expired│ -        │ -              │ Not specified    │ 01 Jun 2022 │ 01 Jun 2024 │ Oslo          │ None     │
└─────────────┴────────┴──────────┴────────────────┴──────────────────┴─────────────┴─────────────┴───────────────┴──────────┘
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/CertificateTable.tsx` | Remove Actions column, add Type column between Category and Issuing Authority |

## Notes

- Users can still edit certificates by clicking the row to open the detail dialog, which has an Edit button
- The `titleRaw` field contains the certificate type (as fixed in earlier changes)
- The Award icon is used for the Type badge since it represents certificate types/qualifications

