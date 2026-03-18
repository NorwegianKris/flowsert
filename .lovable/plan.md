

## Make Certificate Type Rows Expandable with Certificate Details

### Overview
Convert each type row in the "Manage Types" list from a flat `div` to an `Accordion` item that expands to show all certificates assigned to that type. Each certificate row shows worker name, title, expiry status, and is clickable to open the `DocumentPreviewDialog`.

### Changes in `src/components/CertificateTypesManager.tsx`

**1. New imports**
- `Accordion, AccordionItem, AccordionTrigger, AccordionContent` from UI
- `DocumentPreviewDialog` and `DocumentPreviewMetadata`
- `getCertificateStatus, formatExpiryText, getDaysUntilExpiry` from `certificateUtils`
- `useQuery` from tanstack
- `format` from date-fns
- `FileText, Eye` from lucide

**2. New inner component: `TypeCertificatesList`**
- Takes `typeId: string` and `businessId: string`
- Uses `useQuery` to fetch certificates for this type:
  ```sql
  certificates.select('id, name, expiry_date, document_url, date_of_issue, place_of_issue, issuing_authority, personnel:personnel_id(id, name)')
    .eq('certificate_type_id', typeId)
    .order('expiry_date', { ascending: true, nullsFirst: false })
  ```
- Renders each certificate as a clickable row with: personnel name, cert title, expiry badge (green/yellow/red)
- Clicking a row opens `DocumentPreviewDialog` with the document URL and metadata
- Empty state: "No certificates uploaded for this type yet."
- Query only runs when accordion is expanded (use `enabled` flag or just let it fetch on mount — it's lightweight)

**3. Convert type rows to Accordion**
- Wrap the `grouped[category].map(...)` section inside `<Accordion type="multiple">` 
- Each type row becomes an `AccordionItem` with:
  - `AccordionTrigger`: contains the existing type name, archived badge, description, and edit/archive buttons (with `onClick stopPropagation`)
  - `AccordionContent`: renders `<TypeCertificatesList typeId={type.id} />`
- Uses same chevron pattern as CategoriesSection (visible chevron, `hover:no-underline`)

**4. DocumentPreviewDialog state**
- Add state for `previewDoc` (document URL + metadata) in `TypesManageList`
- Pass to a single `DocumentPreviewDialog` instance at the bottom

### Files modified
- `src/components/CertificateTypesManager.tsx`

