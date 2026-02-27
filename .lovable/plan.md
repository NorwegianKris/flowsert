

## Analysis: Why the prompt needs adjustment

The `Certificate` TypeScript interface does **not** have a `certificate_types` nested object. In `usePersonnel.ts` line 122, the canonical name is already **flattened** into `Certificate.name`:

```typescript
name: c.certificate_types?.name || c.name,  // already resolved
```

So `c.certificate_types?.name` doesn't exist on the frontend `Certificate` type — it was resolved at fetch time. The matrix code using `c.name` already gets the canonical type name for **mapped** certificates.

The **real** column explosion happens only for **unmapped** certificates (no `certificate_type_id`), where `Certificate.name` falls back to the raw DB `name` column (the filename). The better fallback is `titleRaw` (the user-typed title), but `usePersonnel.ts` never maps it.

## Corrected plan — 2 files, no migration

### 1. `src/hooks/usePersonnel.ts` — add `titleRaw` to certificate mapping

In both `usePersonnel` (line ~120-130) and `useWorkerPersonnel` (line ~220-230), add `titleRaw` to the Certificate mapping:

```typescript
// Add after certificateTypeId line:
titleRaw: c.title_raw || undefined,
```

Also add `title_raw` to the `DbCertificate` interface (around line 43).

### 2. `src/lib/competenceMatrixPdf.ts` — use `titleRaw` as fallback

**Column collection** (lines 49-54): Replace `c.name` with `c.titleRaw || c.name` — for mapped certs, `c.name` is already the canonical name; for unmapped certs, `titleRaw` groups by user-typed title instead of filename.

```typescript
const certTypeSet = new Set<string>();
activePersonnel.forEach(p => {
  p.certificates.forEach(c => {
    certTypeSet.add(c.titleRaw || c.name);
  });
});
```

**Cell matching** (line ~142): Same fallback logic:

```typescript
const cert = person.certificates.find(c =>
  (c.titleRaw || c.name) === certType
);
```

### What this fixes

- **Mapped certificates**: No change — `c.name` already contains the canonical type name
- **Unmapped certificates**: Groups by user-typed title instead of filename, collapsing duplicates

### Risk: GREEN — purely UI/PDF, no schema, no RLS, no edge functions

