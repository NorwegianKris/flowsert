

## Purple Certificate Status Header in Project View

**Risk: GREEN** -- purely UI color/styling change, no backend or data changes.

### What Changes

The certificate status table header row in `ProjectCertificateStatus.tsx` (showing Personnel, Certificate, Status, Category, Issuing Authority, Date of Issue, Expiry Date, Place of Issue, Document) will change from grey background with dark text to purple background with white text -- matching the existing certificate and document headers in the personnel profile.

### Technical Detail

**File: `src/components/ProjectCertificateStatus.tsx`** (lines 200-210)

Change the `TableRow` background from `bg-muted/30` to `bg-primary` and add `text-white` to all 9 `TableHead` elements:

```tsx
// Before
<TableRow className="bg-muted/30 hover:bg-muted/30">
  <TableHead className="font-semibold">Personnel</TableHead>
  <TableHead className="font-semibold">Certificate</TableHead>
  <TableHead className="font-semibold">Status</TableHead>
  <TableHead className="font-semibold">Category</TableHead>
  <TableHead className="font-semibold">Issuing Authority</TableHead>
  <TableHead className="font-semibold">Date of Issue</TableHead>
  <TableHead className="font-semibold">Expiry Date</TableHead>
  <TableHead className="font-semibold">Place of Issue</TableHead>
  <TableHead className="font-semibold">Document</TableHead>
</TableRow>

// After
<TableRow className="bg-primary hover:bg-primary">
  <TableHead className="font-semibold text-white">Personnel</TableHead>
  <TableHead className="font-semibold text-white">Certificate</TableHead>
  <TableHead className="font-semibold text-white">Status</TableHead>
  <TableHead className="font-semibold text-white">Category</TableHead>
  <TableHead className="font-semibold text-white">Issuing Authority</TableHead>
  <TableHead className="font-semibold text-white">Date of Issue</TableHead>
  <TableHead className="font-semibold text-white">Expiry Date</TableHead>
  <TableHead className="font-semibold text-white">Place of Issue</TableHead>
  <TableHead className="font-semibold text-white">Document</TableHead>
</TableRow>
```

One file, one row background change and 9 `text-white` additions.
