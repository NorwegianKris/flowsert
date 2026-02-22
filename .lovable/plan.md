

## Purple Document Header Bar in Personnel Profile

**Risk: GREEN** -- purely UI styling change.

### What Changes

The document table header row in `PersonnelDocuments.tsx` (showing Document, Category, Date Uploaded, Size, Type, Actions) will change from grey background with black text to purple background with white text, matching the certificate header bar change.

### Technical Detail

**File: `src/components/PersonnelDocuments.tsx`** (lines 481-488)

Change:

```tsx
// Before
<TableRow className="bg-muted/30 hover:bg-muted/30">
  <TableHead className="font-semibold">Document</TableHead>
  <TableHead className="font-semibold">Category</TableHead>
  <TableHead className="font-semibold">Date Uploaded</TableHead>
  <TableHead className="font-semibold">Size</TableHead>
  <TableHead className="font-semibold">Type</TableHead>
  <TableHead className="font-semibold w-28">Actions</TableHead>
</TableRow>

// After
<TableRow className="bg-primary hover:bg-primary">
  <TableHead className="font-semibold text-white">Document</TableHead>
  <TableHead className="font-semibold text-white">Category</TableHead>
  <TableHead className="font-semibold text-white">Date Uploaded</TableHead>
  <TableHead className="font-semibold text-white">Size</TableHead>
  <TableHead className="font-semibold text-white">Type</TableHead>
  <TableHead className="font-semibold text-white w-28">Actions</TableHead>
</TableRow>
```

One file, one row background change and 6 `text-white` additions.

