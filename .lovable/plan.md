

## Move Batch Label Above the Divider Line

**Risk: GREEN** -- purely cosmetic PDF layout tweak, no DB/auth/RLS changes.

**Single file:** `src/lib/competenceMatrixPdf.ts`

### Change (lines 97-109)

Currently the order is:
1. Draw divider line at `y`
2. Draw batch label 4mm below

New order:
1. If batch label exists, draw it 2.5mm below current `y` (above where line will go)
2. Advance `y` by 4mm
3. Draw divider line at new `y`

This keeps `headerHeight` unchanged (38mm for multi-batch) and all other positions identical. The batch label simply appears in the small gap between the metadata and the divider instead of below it.

### Technical detail

Replace lines 97-109:

```typescript
    // Batch label above divider (multi-batch only)
    if (batchLabel) {
      y += 2.5;
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(120, 120, 120);
      doc.text(batchLabel, pageWidth / 2, y, { align: 'center' });
      y += 3;
    }

    // Thin horizontal divider
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageWidth - margin, y);

    doc.setTextColor(0, 0, 0);
```

Single-batch behavior is unaffected since `batchLabel` is undefined -- the divider draws at the same `y` as before.
