

## Fix: Issuers Not Showing in New Project Filter

### Root Cause
The New Project dialog builds the issuers list from the `issuer_types` database table (canonical/mapped issuer types), which is currently empty. The admin dashboard, by contrast, derives issuers directly from the personnel's certificate data (`issuingAuthority` field), so it always shows actual issuers.

### Solution
Change the New Project dialog to derive issuers the same way the admin dashboard does -- from the personnel's certificates -- instead of from the `issuer_types` table.

### Technical Details

**File: `src/components/AddProjectDialog.tsx`**

1. Replace `uniqueIssuers` (line 359) from:
   ```
   const uniqueIssuers = [...new Set(issuerTypes.map(i => i.name))];
   ```
   to derive from the `personnel` prop, matching the admin dashboard pattern:
   ```
   const uniqueIssuers = [...new Set(
     personnel.flatMap(p => p.certificates.map(c => c.issuingAuthority).filter(Boolean))
   )].sort();
   ```

2. The `useIssuerTypes` import and hook call can be removed since they are no longer needed for this list.

3. The toggle group condition on line 914 (`uniqueCertCategories.length > 0 || uniqueIssuers.length > 0`) will now correctly show the toggle when there are actual issuers in the data.

4. No changes needed to the filtering logic itself (line 346: `c.issuingAuthority === filterVal`) since it already matches against the raw `issuingAuthority` field.

