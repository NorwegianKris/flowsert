

## Add Custom Name Field to Merge Dialog

### Change

**File: `src/components/IssuerTypesManager.tsx`**

In the merge confirmation dialog (the `Dialog` with `mergeDialogOpen`):

1. Add a new state variable `mergeNewName: string` (default empty)
2. After the `RadioGroup` for selecting the primary issuer, add a text input field labeled "New name (optional)" with placeholder showing the current primary issuer's name
3. In `handleMerge`, after reassigning certificates/aliases and deleting duplicates, if `mergeNewName.trim()` is non-empty, update the primary issuer's name: `UPDATE issuer_types SET name = mergeNewName WHERE id = primaryIssuerId`
4. Reset `mergeNewName` when the dialog closes or merge completes
5. Auto-update the placeholder when the primary radio selection changes (use the selected primary's current name)

No schema/RLS changes -- uses existing UPDATE permission on `issuer_types`.

