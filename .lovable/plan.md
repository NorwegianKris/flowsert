

## Fix: Place of Issue Returns Local Language Instead of English

### Root Cause
The Nominatim API call in `AddCertificateDialog.tsx` (line 233) is missing the `accept-language=en` parameter. The normalization tool already has this parameter, but the upload flow does not. Without it, Nominatim returns place names in the local language (e.g., "Norge" instead of "Norway").

### Change
**File: `src/components/AddCertificateDialog.tsx`** (line 233)

Add `&accept-language=en` to the Nominatim URL so the response always returns English place names, consistent with the rest of the system.

### Risk Assessment
- Q1 (SQL/migration): No
- Q5 (UI only): Yes -- 🟢 anchor optional

Single parameter addition to an existing API URL. No backend or schema changes.

