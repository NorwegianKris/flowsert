

# Fix: Competence Matrix PDF Horizontal Overflow

## Risk: GREEN
Client-side PDF rendering only (jsPDF/jspdf-autotable). No DB, RLS, auth, or edge function changes.

## Single file changed
`src/lib/competenceMatrixPdf.ts` -- full rewrite of the export function internals.

## Implementation

### 1. Add `chunk` helper (after constants, before main function)
```typescript
function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}
```

### 2. Replace fixed certColWidth computation (lines 93-97) with batch parameters
```typescript
const fixedColsWidth = 42 + 26 + 20; // Name + Role + Type = 88mm
const availableForCerts = pageWidth - 2 * margin - fixedColsWidth;
const minCertColWidth = 12;
const maxCertColsPerBatch = Math.max(1, Math.floor(availableForCerts / minCertColWidth));
const batches = certTypes.length > 0 ? chunk(certTypes, maxCertColsPerBatch) : [[]];
const isMultiBatch = batches.length > 1;
const headerHeight = isMultiBatch ? 38 : 34;
```
- Single batch: `headerHeight = 34` (identical to current)
- Multi-batch: `headerHeight = 38` (extra 4mm for batch label only)

### 3. Update `drawHeader` to accept optional `batchLabel` parameter
- Signature changes from `drawHeader()` to `drawHeader(batchLabel?: string)`
- All existing elements (title, subtitle, metadata, divider) remain at identical Y positions
- When `batchLabel` is provided: adds a small grey line (font 7, color 120/120/120) centered 4mm below divider
- When no `batchLabel`: function is identical to current behavior

### 4. Pre-compute person fixed cells
Build `personFixedCells` array once (Name/Role/Type per person) so it can be reused across batches without recomputation.

### 5. Replace single autoTable call (lines 130-170) with batch loop
For each batch:
- `doc.addPage('l')` for batches after the first
- Compute batch label: `"Certificates 1-15 of 43"` (only when `isMultiBatch`)
- Build `batchTableHead` = `['Name', 'Role', 'Type', ...batchCertTypes]`
- Build `batchTableBody` = fixed cells + cert status for batch cert types only
- `batchCertColWidth = availableForCerts / batchCertTypes.length` (no `Math.max` -- batching guarantees fit)
- Build `batchColumnStyles` for this batch
- Use `didDrawPage` callback to: (a) draw header with batch label, (b) track page-to-batch mapping
- `autoTable` config: `startY: headerHeight`, `margin.top: headerHeight`, `showHead: 'everyPage'`
- All other styling (headStyles, bodyStyles, didParseCell, theme, cellPadding, lineWidth, lineColor) stays identical

### 6. Legend -- once on last page
- After all batches complete, draw legend on the final page
- Uses `(doc as any).lastAutoTable?.finalY` from the last batch
- Same text, font size, and positioning as current

### 7. Global footer pass -- page numbers only
- Loop all pages to draw footers with global `"Page X of Y"` numbering
- Headers are NOT redrawn here (already handled by `didDrawPage`) -- prevents double-drawing
- Footer text and position identical to current

## Behavior guarantees
- Fewer than 16 cert types: single batch, `headerHeight=34`, no batch label, output pixel-identical to current
- 16+ cert types: multiple page sets with repeated fixed columns and batch labels
- 0 cert types: single batch with empty cert columns
- 1 cert type: single batch, single column
- 100+ cert types: many batches, each readable
- Vertical pagination (many rows) continues to work within each batch via `showHead: 'everyPage'`

