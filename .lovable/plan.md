

## Add Issuer Grouping System (Exact Clone of Certificate Type Grouping)

### Overview
Replicate the certificate type grouping system -- identically -- for issuers. The Issuers tab under Settings > Certificates will get the same two-pane merging UI and manage tab that Types currently has. The left pane shows "Inputted Issuers" (distinct `issuing_authority` values from certificates), the right pane shows "Canonical Issuers" (from a new `issuer_types` table). Grouping works the same way: select inputted issuers on the left, select/create a canonical issuer on the right, click "Group".

### What "exactly the same" means

The following components and hooks exist for Types:

| Types System | Issuers System (new, cloned) |
|---|---|
| `certificate_types` table | `issuer_types` table |
| `certificate_aliases` table | `issuer_aliases` table |
| `certificates.certificate_type_id` column | `certificates.issuer_type_id` column |
| `useCertificateTypes.ts` hook | `useIssuerTypes.ts` hook |
| `useCertificateAliases.ts` hook | `useIssuerAliases.ts` hook |
| `useInputtedTypes.ts` hook | `useInputtedIssuers.ts` hook |
| `TypeMergingPane.tsx` component | `IssuerMergingPane.tsx` component |
| `CertificateTypesManager.tsx` component | `IssuerTypesManager.tsx` component |

Every hook and component is a direct clone with names/labels changed from "type" to "issuer" and the field being grouped changed from `title_normalized` / `certificate_type_id` to `issuing_authority` / `issuer_type_id`.

### Database Changes (3 migrations)

**Migration 1: `issuer_types` table** (clone of `certificate_types`)

```sql
CREATE TABLE issuer_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES businesses(id),
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```
- Same RLS policies as `certificate_types`

**Migration 2: `issuer_aliases` table** (clone of `certificate_aliases`)

```sql
CREATE TABLE issuer_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id),
  issuer_type_id uuid NOT NULL REFERENCES issuer_types(id),
  alias_normalized text NOT NULL,
  alias_raw_example text,
  confidence integer NOT NULL DEFAULT 100,
  created_by text NOT NULL,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(business_id, alias_normalized)
);
```
- Same RLS policies as `certificate_aliases`

**Migration 3: Add `issuer_type_id` to `certificates`**

```sql
ALTER TABLE certificates ADD COLUMN issuer_type_id uuid REFERENCES issuer_types(id);
```

### New Files (5 files, all clones)

**`src/hooks/useIssuerTypes.ts`** -- clone of `useCertificateTypes.ts`
- `useIssuerTypes()`, `useCreateIssuerType()`, `useUpdateIssuerType()`, `useArchiveIssuerType()`, `useRestoreIssuerType()`, `useIssuerTypeUsageCount()`
- Usage count queries `certificates` where `issuer_type_id` matches

**`src/hooks/useIssuerAliases.ts`** -- clone of `useCertificateAliases.ts`
- `useCreateIssuerAlias()`, `useIssuerAliases()`
- Normalizes `issuing_authority` text the same way types normalize `title_raw`

**`src/hooks/useInputtedIssuers.ts`** -- clone of `useInputtedTypes.ts`
- `useInputtedIssuers()` -- groups certificates by normalized `issuing_authority`, shows unmapped ones (where `issuer_type_id` is null and `issuing_authority` is not null)
- `useDismissInputtedIssuer()` -- uses same `unmapped_by`/`unmapped_at`/`unmapped_reason` pattern
- Key difference: groups by `issuing_authority` instead of `title_normalized`, checks `issuer_type_id` instead of `certificate_type_id`

**`src/components/IssuerMergingPane.tsx`** -- clone of `TypeMergingPane.tsx`
- Left pane: "Inputted Issuers" with search, select-all, show-mapped toggle, expandable rows showing certificate details
- Right pane: "Canonical Issuers" from `issuer_types` table
- Same "Group" button, "Create and Group" flow, dismiss functionality, document viewer
- Labels changed: "types" becomes "issuers", "Inputted Types" becomes "Inputted Issuers", "Merged Types" becomes "Merged Issuers"
- Grouping logic: creates issuer alias, then bulk-updates `certificates.issuer_type_id`

**`src/components/IssuerTypesManager.tsx`** -- clone of `CertificateTypesManager.tsx`
- Two sub-tabs: "Group Issuers" (shows `IssuerMergingPane`) and "Manage Issuers" (CRUD list)
- Manage list: create, edit, archive, restore canonical issuers -- identical UI to types

### Modified File

**`src/components/CategoriesSection.tsx`**
- Replace `IssuersListInner` with `IssuerTypesManager`
- Update description text from "A read-only list..." to "Manage the official issuing authorities used to organize and group certificates consistently."

### No other changes
- The personnel filter bar is not modified in this plan
- No changes to certificate upload or edit flows
- The existing type grouping system is completely untouched

