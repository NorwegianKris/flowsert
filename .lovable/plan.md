

## Settings → Certificates UI Redesign

**Risk: 🟢 GREEN** — Pure UI/rendering changes. No schema, RLS, or data changes.

### Change 1: CertificateCategoriesManager — Accordion with nested types

**File:** `src/components/CertificateCategoriesManager.tsx`

- Import `Accordion`, `AccordionItem`, `AccordionTrigger`, `AccordionContent` from `ui/accordion`
- Import `Badge` from `ui/badge`
- Import `useCertificateTypes`, `useCreateCertificateType` from hooks
- Replace the flat `divide-y` list with an `Accordion type="multiple"`
- Each `AccordionItem` trigger row shows:
  - Category name (left)
  - Badge with type count (e.g. "15 types") + delete button (right, before chevron)
- Expanded content: alphabetically sorted list of `certificate_types` filtered by `category_id === category.id`, each showing type name + grey badge with usage_count if > 0
- Add a small inline `+ Add type` button at the bottom of each expanded category that creates a new type pre-filled with that category_id using `useCreateCertificateType` (inline input + button, no dialog needed)
- Also show an "Uncategorized" section at the bottom for types with `category_id === null`

### Change 2: TypeMergingPane right pane — group by category

**File:** `src/components/TypeMergingPane.tsx` (lines 726-778)

- After filtering `filteredMerged`, group types by `category_name` (fallback: "Uncategorized")
- Sort groups alphabetically, types alphabetically within each group
- Render: for each group, a bold non-clickable category header row (`font-semibold text-xs uppercase text-muted-foreground bg-muted/50 px-3 py-2`), then the existing type rows beneath it
- Each type row keeps its current radio-select behaviour, click handler, ring highlight — zero changes to interaction
- Show `usage_count` badge on every type (including zero: "0 certificates")

### Change 3: TypeMergingPane left pane — no change needed

The inputted types on the left are **unmapped** certificates (no `certificate_type_id`). They don't have a `category_id` on the certificate itself — the category is a property of `certificate_types`, not certificates. Since unmapped certificates have no type, they have no category. This sub-task is not applicable and will be skipped.

### Files modified
| File | Change |
|---|---|
| `src/components/CertificateCategoriesManager.tsx` | Major rewrite: accordion layout with nested types |
| `src/components/TypeMergingPane.tsx` | Right pane only: add category group headers (lines ~726-778) |

### What does NOT change
- Left pane: checkbox multi-select, collapsible details, dismiss button — untouched
- Right pane: radio select behaviour, click handler, ring highlight — untouched
- Center action area: "Group into Selected", "Create & Group" buttons — untouched
- All dialogs (confirm, create, dismiss, document viewer) — untouched
- No hooks modified, no schema changes

