

## Make Activation List Names Clickable with Profile Preview

**Risk: GREEN** -- UI-only change, no schema/RLS/backend modifications.

---

### Change

**File: `src/components/ActivationOverview.tsx`**

1. **Add state** for the preview sheet: `previewOpen` (boolean) and `previewPerson` (Personnel | null).

2. **Import** `PersonnelPreviewSheet` from `@/components/PersonnelPreviewSheet`.

3. **Make the name clickable**: On line 223, change the plain `<p>` tag displaying `person.name` to a `<button>` (or styled clickable element) with `cursor-pointer`, `hover:underline`, and an `onClick` handler that sets `previewPerson` to the clicked person and opens the sheet.

4. **Render** `<PersonnelPreviewSheet>` at the bottom of the component, passing `previewOpen`, `onOpenChange`, and `previewPerson`.

### No other files changed.

