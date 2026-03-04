

## Fix Certificate Status Table Column Widths

Cosmetic only. No schema changes. 🟢

### Problem
The table has 9 columns that extend beyond the visible area, cutting off the Document column on the right. The Personnel column has excess whitespace that can be reclaimed.

### Solution
Add explicit width classes to `TableHead` and `TableCell` elements, and add `table-fixed` layout with `w-full` to the `<Table>` element. Also wrap the table container in `overflow-x-auto` to handle edge cases.

### Changes — `src/components/ProjectCertificateStatus.tsx`

1. **Table element** (line 221): Add `className="w-full table-fixed"`
2. **Column widths on TableHead** (lines 224-232):
   - Personnel: `w-[18%]` (enough for long names with truncation)
   - Certificate: `w-[14%]`
   - Status: `w-[10%]`
   - Category: `w-[10%]`
   - Issuing Authority: `w-[13%]`
   - Date of Issue: `w-[10%]`
   - Expiry Date: `w-[10%]`
   - Place of Issue: `w-[8%]`
   - Document: `w-[7%]`
3. **Add truncation** to text-heavy cells (Certificate name, Issuing Authority, Place of Issue) to prevent overflow.

This keeps Personnel wide enough for long names while making all columns visible within the card.

