

## Fix Documents Section — Row Selection + Top Action Buttons

### Changes — `src/components/PersonnelDocuments.tsx`

**1. Add `highlightedDoc` state** for row selection (separate from `selectedDocument` which drives the preview dialog).

**2. Remove Actions column** — delete the `<TableHead>Actions</TableHead>` (line 487) and the entire `<TableCell>` with inline action buttons (lines 529-579).

**3. Change row click behavior** — instead of `onClick={() => setSelectedDocument(doc)}`, toggle `highlightedDoc`: click to select, click again to deselect.

**4. Add highlight styling** — selected row gets `bg-primary/10` background.

**5. Update top buttons:**
- **Add** — always enabled (unchanged)
- **Edit** — enabled only when `highlightedDoc` is set; clicks `openEditDialog(highlightedDoc)` directly (removes the edit-select dialog flow)
- **Download** — new button, enabled only when `highlightedDoc` is set; triggers file download via `getPersonnelDocumentUrl`
- **Remove** — enabled only when `highlightedDoc` is set; opens delete confirmation for `highlightedDoc` directly (removes the remove-select dialog flow)

Button order: `[ + Add ] [ ✏ Edit ] [ ⬇ Download ] [ 🗑 Remove ]`

### File
- `src/components/PersonnelDocuments.tsx`

