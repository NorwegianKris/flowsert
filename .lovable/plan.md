

# Refine Personnel Competence Matrix PDF -- Print-Safe Offshore Standard

## Summary
Full rewrite of `src/lib/competenceMatrixPdf.ts` plus minor call-site updates to produce a conservative, audit-ready competence matrix optimized for cheap printers and external sharing.

## Changes

### 1. `src/lib/competenceMatrixPdf.ts` -- Full Rewrite

**Interface update:**
```ts
export interface CompetenceMatrixOptions {
  personnel: Personnel[];
  projectName?: string;
  companyName?: string;
  location?: string;
  activePersonnelCount?: number;
}
```

**Document layout (strict order):**

1. **Title** -- centered, bold, font 16: `PERSONNEL COMPETENCE MATRIX`
2. **Metadata block** -- left-aligned, font 8, grey text:
   - Company / Project / Location
   - Generated date
   - Total Personnel / Active Personnel (when provided)
   - Expiry warning threshold: `Expiry warning: 60 days`
3. **Thin horizontal divider** (light grey, 0.3pt)
4. **Matrix table**
5. **Legend** (last page, below table)
6. **Footer** -- centered, page number only: `Page X of Y` (no duplicate timestamps)

**Table columns (in order):**
| Name | Role | Type | Certificate 1 | Certificate 2 | ... |

- **Name**: 42mm fixed, bold, left-aligned
- **Role**: 26mm fixed, left-aligned, word-wrap
- **Type**: 20mm fixed, left-aligned (shows "Employee" or "Freelancer" from `personnel.category`, defaults to "-")
- **Certificate columns**: equal calculated width, center-aligned

**Header styling (print-safe):**
- Fill: very light grey `[240, 240, 240]` (NOT dark)
- Text: black, bold, font size 6
- Multi-line word-wrap enabled (no rotation)
- Center-aligned

**Body styling:**
- Font size 8
- Status letters bold via `didParseCell` hook
- Subtle cell shading (non-essential, print-safe):
  - V: `[235, 245, 235]` (very light green)
  - E: `[255, 245, 230]` (very light amber)
  - X: `[250, 232, 232]` (very light red)
  - Dash: white (no fill)
- Grid lines: light grey `[200, 200, 200]`, 0.2pt

**Sorting (deterministic):**
- Personnel: alphabetical by full name (`localeCompare`)
- Certificate columns: alphabetical by name (`localeCompare`) -- already done, stays

**Pagination:**
- `showHead: 'everyPage'`
- `rowPageBreak: 'avoid'`
- Landscape A4, consistent 14mm margins

**Legend (last page):**
```
Legend:  V -- Valid    E -- Expiring within 60 days    X -- Expired    - -- Not required / Not registered
```
Font 7, grey. Uses the actual `EXPIRY_WARNING_DAYS` constant (imported from certificateUtils or re-exported).

**Footer (every page):**
```
Page 1 of 3
```
Font 7, centered, grey. No timestamps or branding in footer.

**Active personnel field:** Uses `personnel.activated` (the canonical boolean field from the Personnel type). The `activePersonnelCount` option is provided by callers who pre-compute `personnel.filter(p => p.activated).length`.

### 2. `src/lib/certificateUtils.ts` -- Export Warning Days Constant

Export the existing constant so the PDF generator can reference it:
```ts
export const EXPIRY_WARNING_DAYS = 60;
```

### 3. `src/components/ShareProjectDialog.tsx` -- Pass activePersonnelCount

Update the call to `generateCompetenceMatrixPdf` to include:
```ts
activePersonnelCount: assignedPersonnel.filter(p => p.activated).length,
```

### 4. `src/components/ExternalSharingDialog.tsx` -- Pass activePersonnelCount

Same pattern in `generatePersonnelCertificatesPdf`:
```ts
activePersonnelCount: selectedPersonnel.filter(p => p.activated).length,
```

## What stays the same
- All three export variants (project, selected, full company) use the same generator
- Letter-based status (V, E, X, -) remains the primary signal
- Landscape A4 orientation
- Standard helvetica font throughout
- Backward-compatible interface (new fields optional)

