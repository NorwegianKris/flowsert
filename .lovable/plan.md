

## Add 1 Year Toggle to Compliance Plan Generator

### Overview
Add a "1 year" (365 days) option to the period toggles in both the Overview tab generator and the External Sharing dialog.

### Files

| Action | File |
|--------|------|
| **Edit** | `src/components/CompliancePlanGenerator.tsx` — add `{ value: '365', label: '1 year' }` to `PERIOD_OPTIONS` array (line 38) |
| **Edit** | `src/components/ExternalSharingDialog.tsx` — add `{ value: '365', label: '1 year' }` to inline options array (line 1042), update `periodLabel` logic (line 607) to handle `365` → `'1 year'` |

### Detail

**CompliancePlanGenerator.tsx** line 37 — append new option:
```ts
{ value: '365', label: '1 year' },
```

**ExternalSharingDialog.tsx** line 607 — update label derivation:
```ts
const periodLabel = periodDays === 365 ? '1 year' : periodDays === 180 ? '6 months' : `${periodDays} days`;
```

**ExternalSharingDialog.tsx** line 1042 — append new option:
```ts
{ value: '365', label: '1 year' },
```

No schema, RLS, or backend changes.

