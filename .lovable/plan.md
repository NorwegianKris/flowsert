

## Duplicate Certificate Detection (Frontend-Only)

No schema change, no anchor needed. Pure UI logic in `AddCertificateDialog.tsx`.

### Design

Before inserting each certificate in the `handleSubmit` loop (line 338), query for existing certificates with the same `personnel_id + certificate_type_id` (only when `certificate_type_id` is non-null). If matches exist, pause the loop and show a confirmation dialog with:

- **Existing certificate(s)**: type name, issue date, expiry date, status badge (valid/expired/expiring)
- **New certificate**: same fields
- **Three actions**: "Replace oldest", "Keep both", "Cancel"

### Changes

**1. New component: `src/components/DuplicateCertificateDialog.tsx`**

A dialog that receives:
- `existingCerts`: array of `{ id, name, date_of_issue, expiry_date }` from the query
- `newCert`: the certificate about to be inserted (type name, dates)
- `onReplace`: callback — deletes the oldest existing cert, then proceeds with insert
- `onKeepBoth`: callback — proceeds with insert without deleting
- `onCancel`: callback — skips this certificate

Uses existing `getCertificateStatus` and `formatExpiryText` from `@/lib/certificateUtils` for status display.

**2. Modify `src/components/AddCertificateDialog.tsx`**

In the `handleSubmit` loop (around line 338–387):

- Before the insert call, if `cert.certificateTypeId` is truthy, query:
  ```typescript
  const { data: existing } = await supabase
    .from('certificates')
    .select('id, name, date_of_issue, expiry_date')
    .eq('personnel_id', personnelId)
    .eq('certificate_type_id', cert.certificateTypeId);
  ```
- If `existing?.length > 0`, set state to show `DuplicateCertificateDialog` and await the user's choice via a Promise pattern (resolve on button click)
- On "Replace oldest": delete the cert with the oldest `date_of_issue`, then insert
- On "Keep both": insert directly
- On "Cancel": skip to next cert in the loop

### Promise-based flow for async dialog

Use a ref-held resolver pattern so the `for` loop can `await` user input:

```typescript
const [duplicateCheck, setDuplicateCheck] = useState<{
  existing: Array<{ id: string; name: string; date_of_issue: string; expiry_date: string | null }>;
  newCert: CertificateEntry;
  resolve: (action: 'replace' | 'keep' | 'cancel') => void;
} | null>(null);
```

Inside the loop: `const action = await new Promise<string>(resolve => setDuplicateCheck({ existing, newCert: cert, resolve }));`

### What this catches

- **Renewal**: "You already have an expired BOSIET from 2022. Replace it?" → Replace oldest
- **True duplicate**: "You already have a valid BOSIET issued 2025-01-15." → Cancel or Keep both
- **No match**: No `certificate_type_id` or no existing records → insert silently

### What this does NOT do

- No database constraint (renewals are legitimate)
- No file-hash dedup (out of scope for now)
- Only triggers when `certificate_type_id` is set — free-text-only certs skip the check

