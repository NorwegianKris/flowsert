

## Tech Debt: Refactor `useCreateAlias` hook

**Priority**: Low — complete before second customer onboards.

### Current state
`useCreateAlias` in `src/hooks/useCertificateAliases.ts` (line 135) hardcodes `created_by: "admin"`. The upcoming AI certificate classification feature will bypass this hook entirely, using a direct Supabase insert with `created_by: "system"` and a confidence score (85 for high, 70 for medium). This creates two divergent code paths for alias creation.

### Refactor

1. **Extend `CreateAliasInput` interface** to accept optional `createdBy` (default `"admin"`) and optional `confidence` (default `100`) parameters.

2. **Update `useCreateAlias` mutation** to use `input.createdBy ?? "admin"` and `input.confidence ?? 100` in the insert call instead of hardcoded values.

3. **Migrate AI accept flow** (in `TypeMergingPane.tsx`, once built) to use the refactored hook instead of direct Supabase insert. Pass `createdBy: "system"` and `confidence: 85` or `70`.

### Files changed
- `src/hooks/useCertificateAliases.ts` — extend interface + update insert logic
- `src/components/TypeMergingPane.tsx` — replace direct insert with hook call (after AI classification feature is built)

### Risk: GREEN
Pure refactor. No schema changes. No new sub-processors. No access control changes. Existing admin alias creation behaviour unchanged (defaults preserve current values).

