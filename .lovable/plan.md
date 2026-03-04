

## Add Compliance Plan Export to External Sharing Dialog

### Overview

Add a fourth export option — "Export Compliance Plan" — to the External Sharing dialog. It reuses the same `generateCompliancePlanPdf` function from the Overview tab. When selected, it shows inline period toggles (30d / 90d / 6mo) and uses the existing personnel selection (type toggles, role/group filters, individuals) to scope the plan.

### File

| Action | File |
|--------|------|
| **Edit** | `src/components/ExternalSharingDialog.tsx` |

### Changes

1. **Import** `generateCompliancePlanPdf` from `@/lib/compliancePlanPdf` and `getDaysUntilExpiry` from `@/lib/certificateUtils` (partially already imported). Import `ClipboardList` icon.

2. **New state**: `compliancePlanPeriod` — string, default `'90'`.

3. **New export option card** — add after the Certificate Bundle card (line ~893), same styling pattern:
   - Checkbox + `ClipboardList` icon + "Export Compliance Plan"
   - Subtitle: "Certificate expiry report for the selected period and personnel"
   - `toggleExport('compliancePlan')`

4. **Period toggle** — when `compliancePlan` is selected, show inline below (in `ml-8`):
   - Three small buttons for 30 days / 90 days / 6 months (same pattern as `projectFilter` toggle)

5. **Generate logic** — in `handleDownloadPdfs`, add a block for `compliancePlan`:
   - Get `selectedPersonnel` via `getSelectedPersonnel()`
   - Build `planEntries` array (same logic as `CompliancePlanGenerator.tsx` lines 91–107): iterate personnel certificates, compute `getDaysUntilExpiry`, include if `days <= periodDays || days < 0`
   - Compute `summary`, `byPersonnel`, `byIssuer` groupings (same as CompliancePlanGenerator)
   - Derive `periodLabel` and `filterLabel` from selected groups/roles
   - Call `generateCompliancePlanPdf({ entries, periodLabel, filterLabel, businessName, summary, byPersonnel, byIssuer })`
   - Save as `compliance-plan-{period}d-{date}.pdf`

6. **Same block in `handleEmailPdfs`** — generate and save the PDF, add filename to `attachmentNames`.

7. **`canDownload` update** — if `compliancePlan` is selected, require `selectedPersonnelCount > 0`.

8. **Personnel selection visibility** — update the condition on line 915 to also show personnel selection when `compliancePlan` is selected:
   ```
   (selectedExports.includes('personnelCertificates') || selectedExports.includes('certificateBundle') || selectedExports.includes('compliancePlan'))
   ```

### No schema/RLS changes. Pure client-side PDF generation using existing data and the existing `generateCompliancePlanPdf` utility.

