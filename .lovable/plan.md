

## Merge Certificate and Type Columns

**Problem**: The certificate table shows duplicate information — "Certificate" (column 1) and "Type" (column 4) display the same value (e.g., "Medic" in both).

**Change**: Single file edit in `src/components/CertificateTable.tsx`.

1. **Remove the "Certificate" column header** (line 186) and its cell content (lines 208-213)
2. **Move "Type" to the first column position** and rename the header from "Type" to "Certificate Type"
3. The Type cell keeps its existing badge styling with the Award icon

**Final column order**: Certificate Type → Status → Category → Issuing Authority → Date of Issue → Expiry Date → Place of Issue → Document

**Risk**: 🟢 UI-only change — no data model, no backend, no access control affected.

