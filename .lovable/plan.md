

## Part 1 — Verify Upload Geocoding

**Status: Already working.** Lines 230–256 of `AddCertificateDialog.tsx` show that when OCR extracts a `placeOfIssue`, a fire-and-forget Nominatim call normalizes it to "City, Country" format and updates the form state before the user saves. The field is also rendered as a `GeoLocationInput` (line 676) so the admin can correct it manually. The geocoding runs async but the user must review and click Save, giving it time to resolve. No changes needed.

---

## Part 2 — "Normalize Certificate Locations" Tool

**Risk**: 🟢 UI-only tool. No schema changes. Updates `certificates.place_of_issue` (existing column) and appends to `rescan_previous_data` JSONB. No RLS/auth changes.

### New file: `src/components/CertificateLocationNormalizationTool.tsx`

A Collapsible section placed inside the existing Settings > Locations `CollapsibleContent`, below the existing `LocationStandardizationTool`. Follows the Re-scan tool pattern exactly.

**State machine:**
1. **Idle** — Shows count of unique raw `place_of_issue` values across all certificates in the business. Button: "Normalize locations"
2. **Confirm** — AlertDialog: "This will standardize place of issue for X certificates across Y unique locations. Original data will be saved for rollback. Continue?"
3. **Processing** — Determinate progress bar: "Normalizing X of Y unique locations..." + Stop button
4. **Review** — Summary cards + expandable before/after lists with reject (X) buttons + "Apply All" button
5. **Applying** — Progress while batch-updating certificates

**Data flow:**
1. Query all certificates with non-null, non-empty `place_of_issue` joined through `personnel` (for `business_id` filtering)
2. Group by unique `place_of_issue` values, counting certificates per value
3. Skip values already in "City, Country" format (contains comma, both parts non-empty)
4. For each unique raw value, call Nominatim API with **1000ms delay** between calls
5. Present results for admin review — each mapping shows: old value → new value (X certificates affected), with an X button to reject individual mappings
6. "Apply All" updates certificates in batch (one UPDATE per unique old value), appending `{ place_of_issue_original: oldValue }` to existing `rescan_previous_data` JSONB

**Skip logic:**
- `isStandardized()` check: contains a comma and both parts are non-empty strings
- NULL or empty values
- Values that Nominatim can't resolve → shown in "Failed" list

**Nominatim call** — uses the same Nominatim endpoint as the existing geocoding in `AddCertificateDialog` (line 233), with `User-Agent: FlowSert/1.0` and 1000ms delay between calls.

### Modify: `src/pages/AdminDashboard.tsx`

Import and render `CertificateLocationNormalizationTool` inside the Locations collapsible section (line 918–920), below `LocationStandardizationTool`.

### Files changed

| File | Action |
|---|---|
| `src/components/CertificateLocationNormalizationTool.tsx` | CREATE — new tool component |
| `src/pages/AdminDashboard.tsx` | MODIFY — add import and render in Locations section |

