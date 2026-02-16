

## Add "Issuers" Tab to Certificates Section

### Overview
Add a third toggle option called "Issuers" inside the Certificates sub-tabs (alongside Categories and Types). This tab displays a read-only list of all distinct issuing authorities found across certificates in the business.

### Approach: Read-Only (No New Database Table)
Since `issuing_authority` already exists as a text field on the `certificates` table, the initial version will simply query distinct values and display them in a clean list. No database migration is needed.

### Changes

**1. `src/components/CategoriesSection.tsx`**
- Add a third `TabsTrigger` value `"issuers"` to the certificates sub-tabs (alongside "categories" and "types")
- Update the `TabsList` to accommodate three items
- Add a new `TabsContent value="issuers"` section with a description and an `IssuersListInner` component
- Create the `IssuersListInner` component inline (matching the pattern of `CertificateCategoriesInner` and `DocumentCategoriesInner`):
  - Queries `certificates` table for distinct `issuing_authority` values where `business_id` matches (via a join through `personnel`)
  - Displays them in a bordered, divided list (same style as the category lists)
  - Shows a count footer ("X issuers found")
  - Shows an empty state if no issuing authorities exist
  - Read-only for now (no add/delete)

**2. Query approach**
```sql
SELECT DISTINCT issuing_authority 
FROM certificates c
JOIN personnel p ON p.id = c.personnel_id
WHERE p.business_id = :businessId
  AND c.issuing_authority IS NOT NULL 
  AND c.issuing_authority != ''
ORDER BY issuing_authority
```

### UI Layout
The certificates sub-tabs will change from two to three options:

```text
[ Categories ] [ Types ] [ Issuers ]
```

The hint text will be updated to mention all three concepts.

### What This Does NOT Include (Future Enhancements)
- No new database table for canonical issuers
- No add/edit/delete functionality (read-only for now)
- No mapping of free-text issuers to canonical entries

These can be added later if you decide to formalize issuer management.
