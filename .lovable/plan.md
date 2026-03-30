

## Plan: Remove mandatory field requirements from certificate forms

### File 1: `src/components/EditCertificateDialog.tsx`

**Remove validation block (lines 427-430):** Delete the check that requires `dateOfIssue`, `placeOfIssue`, and `issuingAuthority` — allow saving with any combination of fields filled.

**Remove asterisks from labels:**
- Line 488: `Certificate Name *` → `Certificate Name`
- Line 520: `Date of Issue *` → `Date of Issue`
- Line 564: Remove the conditional `*` from Certificate Type label

### File 2: `src/components/AddCertificateDialog.tsx`

**Relax validation (lines 322-328):** Change `validCerts` filter to only require a certificate type (name) — remove the `hasDateOfIssue` requirement. A certificate without a name is meaningless, but all other fields become optional.

**Remove duplicate warning toast (lines 340-342):** The same toast fires twice — clean up while here.

### No changes to
- Database schema or RLS
- Non-certificate forms

### Risk
Q5 — purely UI validation change.

