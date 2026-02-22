

## Purple Certificate Header Bar in Personnel Profile

**Risk: GREEN** -- purely UI styling change.

### What Changes

The certificate table header row inside a personnel profile (`CertificateTable.tsx`) will change from grey background with black text to a purple/indigo background with white text. This matches the project's primary brand color (Deep Indigo #4338CA).

### Technical Detail

**File: `src/components/CertificateTable.tsx`** (line 182)

Change the `TableRow` className in the `TableHeader`:

```tsx
// Before
<TableRow className="bg-muted/30 hover:bg-muted/30">
  <TableHead className="font-semibold">Certificate</TableHead>
  ...

// After
<TableRow className="bg-primary hover:bg-primary">
  <TableHead className="font-semibold text-white">Certificate</TableHead>
  ...
```

Each of the 9 `TableHead` elements (Certificate, Status, Category, Type, Issuing Authority, Date of Issue, Expiry Date, Place of Issue, Document) gets `text-white` added to its className. The row background changes from `bg-muted/30` to `bg-primary` (the Deep Indigo #4338CA).

One file, one row className change and 9 small `text-white` additions.

