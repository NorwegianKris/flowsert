

## Add "Merge Canonical Issuers" to Manage Issuers Tab

### What it does
Adds multi-select checkboxes to the existing issuer list in the Manage Issuers tab. When 2+ issuers are selected, a "Merge Selected" button appears. Clicking it opens a confirmation dialog where the admin picks the primary issuer (defaulting to highest usage count). On confirm, all certificates and aliases are reassigned to the primary, and the duplicate `issuer_types` rows are deleted.

### Changes

**File: `src/components/IssuerTypesManager.tsx`** (sole file changed)

1. **State**: Add `selectedForMerge: Set<string>`, `mergeDialogOpen`, `isMerging` state variables

2. **Toolbar**: Next to "New Issuer" button, show a "Merge Selected (N)" button when `selectedForMerge.size >= 2`

3. **List rows**: Add a `Checkbox` to the left of each issuer row. Checkbox toggles membership in `selectedForMerge`. Show usage count badge per issuer (already available from the hook's `usage_count` field)

4. **Merge Confirmation Dialog**: 
   - Lists selected issuers with radio buttons to pick primary (auto-selects highest `usage_count`)
   - Shows certificate count per issuer
   - "Merge" button executes the operation

5. **Merge execution logic** (all client-side Supabase SDK calls, no schema changes):
   - `UPDATE certificates SET issuer_type_id = <primary> WHERE issuer_type_id IN (<duplicates>)`
   - `UPDATE issuer_aliases SET issuer_type_id = <primary> WHERE issuer_type_id IN (<duplicates>)` -- catch `23505` silently for conflicts
   - `DELETE FROM issuer_types WHERE id IN (<duplicates>)`
   - Invalidate query keys: `issuer-types`, `issuer-aliases`, `certificates`, `issuer-alias-lookup`
   - Toast success with merged count
   - Clear selection

### Prompt Risk Assessment
- Q1 (SQL/migration): No schema changes -- only client SDK calls against existing tables with existing RLS policies. GREEN.
- Q2 (edge functions/auth): No. GREEN.
- Q3 (access control): No changes to RLS. GREEN.

### No AI Detect Duplicates in this iteration
Can be added as a follow-up feature.

