

## Add Issuer Selector to Certificate Upload Form

### Overview
Replace the plain text "Issuing Authority" input in the Add Certificate dialog with an `IssuerTypeSelector` component that works identically to the existing `CertificateTypeSelector`. Users will see canonical issuers in a dropdown and can type free text if not found. Free text entries become "inputted issuers" available for later merging in Settings.

### What Changes

**1. New Component: `src/components/IssuerTypeSelector.tsx`**
- Direct clone of `CertificateTypeSelector.tsx`
- Uses `useIssuerTypes` instead of `useCertificateTypes`
- Same props: `value`, `onChange`, `allowFreeText`, `freeTextValue`, `onFreeTextChange`, `autoMatched`, etc.
- Same dropdown with search, same "or type if not found" free text layout

**2. Add Lookup Hook: `src/hooks/useIssuerAliases.ts`**
- Add `useLookupIssuerAlias(rawIssuer)` -- mirrors `useLookupAlias` from `useCertificateAliases.ts`
- Queries `issuer_aliases` table by `alias_normalized` to find a matching canonical issuer
- Add `useCreateIssuerAlias` (already exists but verify it matches the pattern)
- Add `useUpdateIssuerAliasLastSeen` for last_seen_at updates

**3. Modified: `src/components/AddCertificateDialog.tsx`**

Add new fields to `CertificateEntry` interface:
```text
issuerTypeId?: string | null;
issuerTypeName?: string;
issuerTypeFreeText?: string;
rememberIssuerAlias?: boolean;
issuerAliasAutoMatched?: boolean;
```

Replace the plain "Issuing Authority" `<Input>` (lines 603-614) with:
- `IssuerTypeSelector` using `allowFreeText` mode (identical layout to the type selector)
- Issuer alias lookup feedback ("Matched: DNV GL" with "Use this issuer" button)
- "Remember this issuer" checkbox for admins (mirrors "Remember this name" for types)

On submit:
- Store `issuer_type_id` on the certificate when a canonical issuer is selected
- Create issuer alias if admin checked "Remember this issuer"
- The free-text value still populates `issuing_authority` for backward compatibility

### No Database Changes
The `issuer_type_id` column, `issuer_types` table, and `issuer_aliases` table already exist. No migrations needed.

### Files Summary

| File | Action |
|---|---|
| `src/components/IssuerTypeSelector.tsx` | New (clone of CertificateTypeSelector, uses useIssuerTypes) |
| `src/hooks/useIssuerAliases.ts` | Modified (add useLookupIssuerAlias hook) |
| `src/components/AddCertificateDialog.tsx` | Modified (replace Input with IssuerTypeSelector, add alias logic) |

